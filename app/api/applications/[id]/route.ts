import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyAdminAuth, rateLimit } from "@/lib/security"
import { 
  applicationUpdateSchema, 
  sanitizeInput, 
  validateApplicationIntegrity,
  validateUpdatePermissions 
} from "@/lib/validation"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Enhanced rate limiting with stricter limits for admin actions
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = rateLimit(ip, 5, 60000) // Max 5 approval actions per minute
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: "For mange requests. Prøv igen senere." },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const requestData = await request.json()
    const { status, rejectionReason } = requestData
    const { id } = params

    // CRITICAL: Secure admin authentication with server-side role verification
    const authResult = await verifyAdminAuth(request, requestData.adminInfo)
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const verifiedAdmin = authResult.user

    // Input validation with enhanced security
        try {
          const cleanedData = {
            status,
            rejectionReason,
            adminInfo: verifiedAdmin // Use server-verified admin data
          }
          applicationUpdateSchema.parse(cleanedData)
        } catch (validationError) {
          return NextResponse.json({ error: "Ugyldig input data" }, { status: 400 })
        }

        // Secure database update with additional validation
        console.log(`[DEBUG] Opdaterer ansøgning ${sanitizedId} med status: ${status}`)
        const result = await db.collection("applications").updateOne(
          { 
            id: sanitizedId,
            status: { $in: ["pending", "approved", "rejected"] } // Ensure valid current status
          }, 
          { $set: updateData }
        )

        console.log(`[DEBUG] Database update result - matchedCount: ${result.matchedCount}, modifiedCount: ${result.modifiedCount}`)

        if (result.matchedCount === 0) {
          return NextResponse.json({ error: "Ansøgning ikke fundet eller allerede behandlet" }, { status: 404 })
        }

        // Hent opdateret ansøgning med sanitized query
        const updated = await db.collection("applications").findOne({ id: sanitizedId })
        if (!updated) {
          return NextResponse.json({ error: "Kunne ikke hente opdateret ansøgning" }, { status: 404 })
        }

        // Discord integration og kanal/webhook oprettelse
        try {
          if (updated.status === "approved" || updated.status === "rejected") {
            const botToken = process.env.DISCORD_BOT_TOKEN
            const guildId = process.env.DISCORD_GUILD_ID
            const webhookUrl = process.env.DISCORD_WEBHOOK_URL

            if (botToken && guildId) {
              if (updated.status === "approved") {
                // Send webhook besked for whitelist godkendelser
                if (webhookUrl && updated.type === "whitelist") {
                  const mention = `<@${updated.discordId}>`
                  const besked = `${mention} - Din ${updated.type} ansøgning er godkendt!`
                  await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: besked })
                  })
                }
                // Giv whitelist rolle automatisk
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
                // Opret kanal for visse ansøgningstyper
                const channelTypes = ["bande", "firma", "staff", "wlmodtager", "cc", "Betatester"]
                if (channelTypes.includes(updated.type)) {
                  const categoryMapping: { [key: string]: string } = {
                    bande: process.env.DISCORD_BANDE_CATEGORY_ID || "",
                    firma: process.env.DISCORD_FIRMA_CATEGORY_ID || "",
                    staff: process.env.DISCORD_STAFF_CATEGORY_ID || "",
                    wlmodtager: process.env.DISCORD_WLMODTAGER_CATEGORY_ID || "",
                    cc: process.env.DISCORD_CC_CATEGORY_ID || "",
                    Betatester: process.env.DISCORD_BETATEST_CATEGORY_ID || ""
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
                        type: 0,
                        parent_id: categoryId,
                        permission_overwrites: [
                          { id: guildId, type: 0, deny: "1024" },
                          { id: updated.discordId, type: 1, allow: "1024" }
                        ]
                      })
                    })
                    if (channelResponse.ok) {
                      const newChannel = await channelResponse.json()
                      const responsibleRoleMapping: { [key: string]: string } = {
                        bande: process.env.DISCORD_BANDE_RESPONSIBLE_ROLE_ID || "",
                        firma: process.env.DISCORD_FIRMA_RESPONSIBLE_ROLE_ID || "",
                        staff: process.env.DISCORD_STAFF_RESPONSIBLE_ROLE_ID || "",
                        wlmodtager: process.env.DISCORD_WLMODTAGER_RESPONSIBLE_ROLE_ID || "",
                        cc: process.env.DISCORD_CC_RESPONSIBLE_ROLE_ID || "",
                        Betatester: process.env.DISCORD_BETATEST_RESPONSIBLE_ROLE_ID || ""
                      }
                      const responsibleRoleId = responsibleRoleMapping[updated.type]
                      if (responsibleRoleId) {
                        const sanitizedUsername = sanitizeInput(updated.discordName.split('#')[0])
                        const sanitizedFields = Object.entries(updated.fields)
                          .map(([key, value]) => `**${sanitizeInput(key)}:** ${sanitizeInput(String(value))}`)
                          .join("\n")
                        const welcomeMessage = `## Hej, ${sanitizedUsername}.\nDin ansøgning er blevet læst og godkendt.\nI denne kanal vil du kunne skrive med en ansvarlig, så I kan finde ud af hvad der skal ske nu.\n\n<@&${responsibleRoleId}>\n\n> Din ansøgning:\n${sanitizedFields}`
                        await fetch(`https://discord.com/api/v10/channels/${newChannel.id}/messages`, {
                          method: "POST",
                          headers: {
                            "Authorization": `Bot ${botToken}`,
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ content: welcomeMessage })
                        })
                      }
                    } else {
                      console.error(`❌ Kanal oprettelse fejlede for ${channelName}:`, await channelResponse.text())
                    }
                  } else {
                    console.error(`❌ Mangler categoryId for ${updated.type}, kan ikke oprette kanal.`)
                  }
                }
              } else if (updated.status === "rejected") {
                // Webhook for whitelist afvisning
                if (webhookUrl && updated.type === "whitelist") {
                  const mention = `<@${updated.discordId}>`
                  const besked = `${mention} - Din whitelist ansøgning er afvist!`
                  await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: besked })
                  })
                }
                // DM til bruger med afvisningsgrund
                const dmResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bot ${botToken}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ recipient_id: updated.discordId })
                })
                if (dmResponse.ok) {
                  const dmChannel = await dmResponse.json()
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
                  const rejectionMessage = `Hej ${updated.discordName.split('#')[0]}.
        try {
          if (updated.status === "approved") {
            // ...Discord integration og kanal oprettelse...
          } else if (updated.status === "rejected") {
            // ...Discord integration for afvisning...
                  await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
                    method: "POST",
                    headers: {
                      "Authorization": `Bot ${botToken}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ content: rejectionMessage })
                  })
                } else {
                  console.error(`❌ DM kanal oprettelse fejlede for ${updated.discordName}:`, await dmResponse.text())
                }
              }
            }
          }
        } catch (discordError) {
          console.error("Fejl ved Discord integration:", discordError)
        }

        // Logging til Discord webhook (admin handling)
        if (verifiedAdmin) {
          try {
            const webhookMapping: { [key: string]: string } = {
              whitelist: process.env.DISCORD_WHITELIST_LOGS_WEBHOOK_URL || "",
              staff: process.env.DISCORD_STAFF_LOGS_WEBHOOK_URL || "",
              wlmodtager: process.env.DISCORD_WLMODTAGER_LOGS_WEBHOOK_URL || "",
              cc: process.env.DISCORD_CC_LOGS_WEBHOOK_URL || "",
              bande: process.env.DISCORD_BANDE_LOGS_WEBHOOK_URL || "",
              firma: process.env.DISCORD_FIRMA_LOGS_WEBHOOK_URL || "",
              Betatester: process.env.DISCORD_BETATEST_LOGS_WEBHOOK_URL || ""
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
              const sanitizedAdminName = sanitizeInput(verifiedAdmin.discordName)
              const sanitizedApplicantName = sanitizeInput(updated.discordName)
              const sanitizedApplicationType = sanitizeInput(getApplicationTypeName(updated.type))
              const sanitizedRejectionReason = updated.rejectionReason ? sanitizeInput(updated.rejectionReason) : null
              let logMessage = `${statusEmoji} **ANSØGNING ${statusText}**\n\n`
              logMessage += `**Admin:** <@${verifiedAdmin.discordId}> (${sanitizedAdminName})\n`
              logMessage += `**Ansøger:** <@${updated.discordId}> (${sanitizedApplicantName})\n`
              logMessage += `**Type:** ${sanitizedApplicationType}\n`
              logMessage += `**Ansøgnings ID:** ${sanitizeInput(updated.id)}\n`
              logMessage += `**Tid:** <t:${Math.floor(Date.now() / 1000)}:F>\n`
              if (updated.status === "rejected" && sanitizedRejectionReason) {
                logMessage += `**Afvisningsgrund:** ${sanitizedRejectionReason}\n`
              }
              await fetch(logsWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  content: logMessage,
                  username: `${getApplicationTypeName(updated.type)} Logger`,
                  avatar_url: "https://cdn.discordapp.com/emojis/1234567890123456789.png"
                })
              })
              const webhookType = specificWebhookUrl ? "specifik" : "fallback"
              console.log(`📝 Loggede admin handling til ${webhookType} webhook: ${sanitizedAdminName} ${statusText} ${updated.type} ansøgning`)
            }
          } catch (logError) {
            console.error("Fejl ved logging:", logError)
          }
        }

        return NextResponse.json({ success: true, application: updated })
        } catch (error) {
          console.error("Fejl ved Discord integration:", error)
        }
      }
    }
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

    // Send secure log til Discord om admin handling - brug specifik webhook for hver type
    if (verifiedAdmin) {
      try {
        // Vælg den rigtige webhook baseret på ansøgningstype
        const webhookMapping: { [key: string]: string } = {
          whitelist: process.env.DISCORD_WHITELIST_LOGS_WEBHOOK_URL || "",
          staff: process.env.DISCORD_STAFF_LOGS_WEBHOOK_URL || "",
          wlmodtager: process.env.DISCORD_WLMODTAGER_LOGS_WEBHOOK_URL || "",
          cc: process.env.DISCORD_CC_LOGS_WEBHOOK_URL || "",
          bande: process.env.DISCORD_BANDE_LOGS_WEBHOOK_URL || "",
          firma: process.env.DISCORD_FIRMA_LOGS_WEBHOOK_URL || "",
          Betatester: process.env.DISCORD_BETATEST_LOGS_WEBHOOK_URL || ""
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
          
          // SECURITY: Sanitize all user-controlled data in Discord messages
          const sanitizedAdminName = sanitizeInput(verifiedAdmin!.discordName)
          const sanitizedApplicantName = sanitizeInput(updated.discordName)
          const sanitizedApplicationType = sanitizeInput(getApplicationTypeName(updated.type))
          const sanitizedRejectionReason = updated.rejectionReason ? sanitizeInput(updated.rejectionReason) : null
          
          let logMessage = `${statusEmoji} **ANSØGNING ${statusText}**\n\n`
          logMessage += `**Admin:** <@${verifiedAdmin!.discordId}> (${sanitizedAdminName})\n`
          logMessage += `**Ansøger:** <@${updated.discordId}> (${sanitizedApplicantName})\n`
          logMessage += `**Type:** ${sanitizedApplicationType}\n`
          logMessage += `**Ansøgnings ID:** ${sanitizeInput(updated.id)}\n`
          logMessage += `**Tid:** <t:${Math.floor(Date.now() / 1000)}:F>\n`
          
          if (updated.status === "rejected" && sanitizedRejectionReason) {
            logMessage += `**Afvisningsgrund:** ${sanitizedRejectionReason}\n`
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
          console.log(`📝 Loggede admin handling til ${webhookType} webhook: ${sanitizedAdminName} ${statusText} ${updated.type} ansøgning`)
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
