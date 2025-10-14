import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyAdminAuth, rateLimit } from "@/lib/security"
import { applicationUpdateSchema, sanitizeInput } from "@/lib/validation"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = rateLimit(ip, 
      parseInt(process.env.RATE_LIMIT_MAX || '10'),
      parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
    )
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: "For mange requests. Prøv igen senere." },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const requestData = await request.json()
    const { status, rejectionReason, adminInfo } = requestData
    const { id } = params

    // Input validation
    try {
      applicationUpdateSchema.parse(requestData)
    } catch (validationError) {
      return NextResponse.json(
        { error: "Ugyldig input data" },
        { status: 400 }
      )
    }

    // Admin authentication
    const authResult = await verifyAdminAuth(adminInfo)
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // Sanitize input
    const sanitizedId = sanitizeInput(id)
    const sanitizedRejectionReason = rejectionReason ? sanitizeInput(rejectionReason) : undefined

    const client = await clientPromise
    const db = client.db("divisionhjemmeside")
    
    // Opdater status og eventuelt afvisningsgrund med sanitized data
    const updateData: any = { 
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: adminInfo.discordId
    }
    if (sanitizedRejectionReason && status === "rejected") {
      updateData.rejectionReason = sanitizedRejectionReason
    }
    
    // Use sanitized ID for database query
    const result = await db.collection("applications").updateOne(
      { id: sanitizedId }, 
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Ansøgning ikke fundet" }, { status: 404 })
    }
    
    // Hent opdateret ansøgning
    const updated = await db.collection("applications").findOne({ id: sanitizedId })
    if (!updated) {
      return NextResponse.json({ error: "Ansøgning ikke fundet" }, { status: 404 })
    }
    // Håndter Discord integration baseret på status
    if (updated.status === "approved" || updated.status === "rejected") {
      const botToken = process.env.DISCORD_BOT_TOKEN
      const guildId = process.env.DISCORD_GUILD_ID
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL
      
      if (botToken && guildId) {
        try {
          if (updated.status === "approved") {
            // Send kun webhook besked for whitelist godkendelser
            if (webhookUrl && updated.type === "whitelist") {
              const mention = `<@${updated.discordId}>`
              const besked = `${mention} - Din ${updated.type} ansøgning er godkendt!`
              
              await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: besked })
              })
            }

            // Giv kun whitelist rolle automatisk
            if (updated.type === "whitelist") {
              const whitelistRoleId = process.env.DISCORD_WHITELIST_ROLE_ID
              
              if (whitelistRoleId) {
                await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${updated.discordId}/roles/${whitelistRoleId}`, {
                  method: "PUT",
                  headers: {
                    "Authorization": `Bot ${botToken}`,
                    "Content-Type": "application/json"
                  }
                })
                console.log(`✅ Gav whitelist rolle til ${updated.discordName}`)
              }
            }

            // Opret privat kanal for visse ansøgningstyper
            const channelTypes = ["bande", "firma", "staff", "wlmodtager", "cc"]
            if (channelTypes.includes(updated.type)) {
              const categoryMapping: { [key: string]: string } = {
                bande: process.env.DISCORD_BANDE_CATEGORY_ID || "",
                firma: process.env.DISCORD_FIRMA_CATEGORY_ID || "",
                staff: process.env.DISCORD_STAFF_CATEGORY_ID || "",
                wlmodtager: process.env.DISCORD_WLMODTAGER_CATEGORY_ID || "",
                cc: process.env.DISCORD_CC_CATEGORY_ID || ""
              }
              
              const categoryId = categoryMapping[updated.type]
              const channelName = `${updated.type}-${updated.discordName.split('#')[0].toLowerCase()}`
              
              if (categoryId) {
                const channelResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bot ${botToken}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    name: channelName,
                    type: 0, // Text channel
                    parent_id: categoryId,
                    permission_overwrites: [
                      {
                        id: guildId, // @everyone
                        type: 0,
                        deny: "1024" // VIEW_CHANNEL
                      },
                      {
                        id: updated.discordId, // User
                        type: 1,
                        allow: "1024" // VIEW_CHANNEL
                      }
                    ]
                  })
                })
                
                if (channelResponse.ok) {
                  const newChannel = await channelResponse.json()
                  console.log(`✅ Oprettede kanal: ${channelName}`)
                  
                  // Send besked i den nyoprettede kanal
                  const responsibleRoleMapping: { [key: string]: string } = {
                    bande: process.env.DISCORD_BANDE_RESPONSIBLE_ROLE_ID || "",
                    firma: process.env.DISCORD_FIRMA_RESPONSIBLE_ROLE_ID || "",
                    staff: process.env.DISCORD_STAFF_RESPONSIBLE_ROLE_ID || "",
                    wlmodtager: process.env.DISCORD_WLMODTAGER_RESPONSIBLE_ROLE_ID || "",
                    cc: process.env.DISCORD_CC_RESPONSIBLE_ROLE_ID || ""
                  }
                  
                  const responsibleRoleId = responsibleRoleMapping[updated.type]
                  if (responsibleRoleId) {
                    const welcomeMessage = `## Hej, ${updated.discordName.split('#')[0]}.\nDin ansøgning er blevet læst og godkendt.\nI denne kanal vil du kunne skrive med en ansvarlig, så I kan finde ud af hvad der skal ske nu.\n\n<@&${responsibleRoleId}>\n\n> Din ansøgning:\n${Object.entries(updated.fields).map(([key, value]) => `**${key}:** ${value}`).join("\n")}`
                    
                    await fetch(`https://discord.com/api/v10/channels/${newChannel.id}/messages`, {
                      method: "POST",
                      headers: {
                        "Authorization": `Bot ${botToken}`,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        content: welcomeMessage
                      })
                    })
                    
                    console.log(`✅ Sendte velkomstbesked i kanal: ${channelName}`)
                  }
                }
              }
            }
            
          } else if (updated.status === "rejected") {
            // Send DM til bruger med afvisningsgrund
            try {
              // Opret DM kanal
              const dmResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
                method: "POST",
                headers: {
                  "Authorization": `Bot ${botToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  recipient_id: updated.discordId
                })
              })
              
              if (dmResponse.ok) {
                const dmChannel = await dmResponse.json()
                
                // Send afvisnings besked i nyt format
                const getApplicationTypeName = (type: string) => {
                  const typeNames: { [key: string]: string } = {
                    whitelist: "Whitelist Ansøgning",
                    staff: "Staff Ansøgning", 
                    wlmodtager: "Whitelist Modtager",
                    cc: "Content Creator Ansøgning",
                    bande: "Bande Ansøgning",
                    firma: "Firma Ansøgning"
                  }
                  return typeNames[type] || type
                }
                
                const rejectionMessage = `Hej ${updated.discordName.split('#')[0]}.\nVi har læst din ansøgning igennem, og bliver desværre nød til at afvise dig i denne omgang.\n**Ansøgning:** ${getApplicationTypeName(updated.type)}\n**Grundlag:** ${updated.rejectionReason || "Ikke angivet"}\n\n> Du er velkommen til at ansøge igen om 24 timer.\n- Division`
                
                await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bot ${botToken}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    content: rejectionMessage
                  })
                })
                
                console.log(`✅ Sendte afvisnings DM til ${updated.discordName}`)
              }
            } catch (dmError) {
              console.error("Fejl ved afsendelse af DM:", dmError)
            }
          }
          
        } catch (error) {
          console.error("Fejl ved Discord integration:", error)
        }
      }
    }

    // Send log til Discord om admin handling - brug specifik webhook for hver type
    if (adminInfo) {
      try {
        // Vælg den rigtige webhook baseret på ansøgningstype
        const webhookMapping: { [key: string]: string } = {
          whitelist: process.env.DISCORD_WHITELIST_LOGS_WEBHOOK_URL || "",
          staff: process.env.DISCORD_STAFF_LOGS_WEBHOOK_URL || "",
          wlmodtager: process.env.DISCORD_WLMODTAGER_LOGS_WEBHOOK_URL || "",
          cc: process.env.DISCORD_CC_LOGS_WEBHOOK_URL || "",
          bande: process.env.DISCORD_BANDE_LOGS_WEBHOOK_URL || "",
          firma: process.env.DISCORD_FIRMA_LOGS_WEBHOOK_URL || ""
        }
        
        const specificWebhookUrl = webhookMapping[updated.type]
        const fallbackWebhookUrl = process.env.DISCORD_LOGS_WEBHOOK_URL
        const logsWebhookUrl = specificWebhookUrl || fallbackWebhookUrl
        
        if (logsWebhookUrl) {
          const getApplicationTypeName = (type: string) => {
            const typeNames: { [key: string]: string } = {
              whitelist: "Whitelist Ansøgning",
              staff: "Staff Ansøgning", 
              wlmodtager: "Whitelist Modtager",
              cc: "Content Creator Ansøgning",
              bande: "Bande Ansøgning",
              firma: "Firma Ansøgning"
            }
            return typeNames[type] || type
          }

          const statusEmoji = updated.status === "approved" ? "✅" : updated.status === "rejected" ? "❌" : "⏳"
          const statusText = updated.status === "approved" ? "GODKENDT" : updated.status === "rejected" ? "AFVIST" : "AFVENTENDE"
          
          let logMessage = `${statusEmoji} **ANSØGNING ${statusText}**\n\n`
          logMessage += `**Admin:** <@${adminInfo.discordId}> (${adminInfo.discordName})\n`
          logMessage += `**Ansøger:** <@${updated.discordId}> (${updated.discordName})\n`
          logMessage += `**Type:** ${getApplicationTypeName(updated.type)}\n`
          logMessage += `**Ansøgnings ID:** ${updated.id}\n`
          logMessage += `**Tid:** <t:${Math.floor(Date.now() / 1000)}:F>\n`
          
          if (updated.status === "rejected" && updated.rejectionReason) {
            logMessage += `**Afvisningsgrund:** ${updated.rejectionReason}\n`
          }

          await fetch(logsWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              content: logMessage,
              username: `${getApplicationTypeName(updated.type)} Logger`,
              avatar_url: "https://cdn.discordapp.com/emojis/1234567890123456789.png" // Optional: Add a logger bot avatar
            })
          })
          
          const webhookType = specificWebhookUrl ? "specifik" : "fallback"
          console.log(`📝 Loggede admin handling til ${webhookType} webhook: ${adminInfo.discordName} ${statusText} ${updated.type} ansøgning`)
        }
      } catch (logError) {
        console.error("Fejl ved logging:", logError)
      }
    }

    return NextResponse.json({ success: true, application: updated })
  } catch (error) {
    console.error("Failed to update application:", error)
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 })
  }
}
