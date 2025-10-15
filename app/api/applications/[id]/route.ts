import { NextRequest, NextResponse } from "next/server"import { NextRequest, NextResponse } from "next/server"

import clientPromise from "@/lib/mongodb"import clientPromise from "@/lib/mongodb"

import { verifyAdminAuth, rateLimit } from "@/lib/security"import { verifyAdminAuth, rateLimit } from "@/lib/security"

import { import { 

  applicationUpdateSchema,   applicationUpdateSchema, 

  sanitizeInput,   sanitizeInput, 

  validateApplicationIntegrity,  validateApplicationIntegrity,

  validateUpdatePermissions   validateUpdatePermissions 

} from "@/lib/validation"} from "@/lib/validation"



export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {

  try {  try {

    // Enhanced rate limiting with stricter limits for admin actions    // Enhanced rate limiting with stricter limits for admin actions

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const rateLimitResult = rateLimit(ip, 5, 60000) // Max 5 approval actions per minute    const rateLimitResult = rateLimit(ip, 5, 60000) // Max 5 approval actions per minute

        

    if (rateLimitResult.limited) {    if (rateLimitResult.limited) {

      return NextResponse.json(      return NextResponse.json(

        { error: "For mange requests. Prøv igen senere." },        { error: "For mange requests. Prøv igen senere." },

        { status: 429, headers: { 'Retry-After': '60' } }        { status: 429, headers: { 'Retry-After': '60' } }

      )      )

    }    }



    const requestData = await request.json()    const requestData = await request.json()

    const { status, rejectionReason } = requestData    const { status, rejectionReason } = requestData

    const { id } = params    const { id } = params



    // CRITICAL: Secure admin authentication with server-side role verification    // CRITICAL: Secure admin authentication with server-side role verification

    const authResult = await verifyAdminAuth(request, requestData.adminInfo)    const authResult = await verifyAdminAuth(request, requestData.adminInfo)

    if (authResult.error) {    if (authResult.error) {

      return NextResponse.json(      return NextResponse.json(

        { error: authResult.error },        { error: authResult.error },

        { status: authResult.status }        { status: authResult.status }

      )      )

    }    }



    const verifiedAdmin = authResult.user    const verifiedAdmin = authResult.user



    // Input validation with enhanced security    // Input validation with enhanced security

    try {    try {

      const cleanedData = {      const cleanedData = {

        status,        status,

        rejectionReason,        rejectionReason,

        adminInfo: verifiedAdmin // Use server-verified admin data        adminInfo: verifiedAdmin // Use server-verified admin data

      }      }

      applicationUpdateSchema.parse(cleanedData)      applicationUpdateSchema.parse(cleanedData)

    } catch (validationError) {    } catch (validationError) {

      return NextResponse.json(      return NextResponse.json(

        { error: "Ugyldig input data" },        { error: "Ugyldig input data" },

        { status: 400 }        { status: 400 }

      )      )

    }    }



    // Sanitize application ID (support multiple ID formats)    // Sanitize application ID (support multiple ID formats)

    const sanitizedId = sanitizeInput(id)    const sanitizedId = sanitizeInput(id)

    // Support both ObjectId format (24 hex chars) and custom format (timestamp-random)    // Support both ObjectId format (24 hex chars) and custom format (timestamp-random)

    const isValidId = sanitizedId.match(/^[a-f0-9]{24}$/i) || sanitizedId.match(/^\d{13,}-[a-z0-9]+$/i)    const isValidId = sanitizedId.match(/^[a-f0-9]{24}$/i) || sanitizedId.match(/^\d{13,}-[a-z0-9]+$/i)

    if (!isValidId) {    if (!isValidId) {

      return NextResponse.json(      return NextResponse.json(

        { error: "Ugyldigt ansøgnings-ID format" },        { error: "Ugyldigt ansøgnings-ID format" },

        { status: 400 }        { status: 400 }

      )      )

    }    }



    const sanitizedRejectionReason = rejectionReason ? sanitizeInput(rejectionReason) : undefined    const sanitizedRejectionReason = rejectionReason ? sanitizeInput(rejectionReason) : undefined



    const client = await clientPromise    const client = await clientPromise

    const db = client.db("divisionwebsite")    const db = client.db("divisionwebsite")

        

    // CRITICAL: Fetch original application and validate integrity    // CRITICAL: Fetch original application and validate integrity

    const originalApp = await db.collection("applications").findOne({ id: sanitizedId })    const originalApp = await db.collection("applications").findOne({ id: sanitizedId })

    if (!originalApp) {    if (!originalApp) {

      return NextResponse.json({ error: "Ansøgning ikke fundet" }, { status: 404 })      return NextResponse.json({ error: "Ansøgning ikke fundet" }, { status: 404 })

    }    }



    console.log(`[DEBUG] Original ansøgning fundet - Type: ${originalApp.type}, Status: ${originalApp.status}`)    // Verify admin has permission to update this application type

    if (!verifiedAdmin || !validateUpdatePermissions(originalApp.type, verifiedAdmin.roles)) {

    // Verify admin has permission to update this application type      return NextResponse.json(

    if (!verifiedAdmin || !validateUpdatePermissions(originalApp.type, verifiedAdmin.roles)) {        { error: "Du har ikke rettigheder til at godkende denne ansøgningstype" },

      return NextResponse.json(        { status: 403 }

        { error: "Du har ikke rettigheder til at godkende denne ansøgningstype" },      )

        { status: 403 }    }

      )

    }    // Validate application data hasn't been tampered with

    if (!validateApplicationIntegrity(originalApp, requestData)) {

    // Validate application data hasn't been tampered with (simplified for status updates)      return NextResponse.json(

    if (!validateApplicationIntegrity(originalApp, requestData)) {        { error: "Ulovlig datamanipulation detekteret" },

      return NextResponse.json(        { status: 400 }

        { error: "Ulovlig datamanipulation detekteret" },      )

        { status: 400 }    }

      )    

    }    // Create secure update object with sanitized data

        const updateData: any = { 

    // Create secure update object with sanitized data      status: status, // Only allow approved/rejected/pending

    const updateData: any = {       updatedAt: new Date().toISOString(),

      status: status, // Only allow approved/rejected/pending      updatedBy: verifiedAdmin!.discordId, // Use server-verified admin ID

      updatedAt: new Date().toISOString(),      updatedByName: verifiedAdmin!.discordName

      updatedBy: verifiedAdmin!.discordId, // Use server-verified admin ID    }

      updatedByName: verifiedAdmin!.discordName    

    }    // Only add rejection reason if status is actually rejected and it's provided

        if (sanitizedRejectionReason && status === "rejected") {

    // Only add rejection reason if status is actually rejected and it's provided      updateData.rejectionReason = sanitizedRejectionReason

    if (sanitizedRejectionReason && status === "rejected") {    }

      updateData.rejectionReason = sanitizedRejectionReason    

    }    // Secure database update with additional validation

        console.log(`[DEBUG] Opdaterer ansøgning ${sanitizedId} med status: ${status}`)

    // Secure database update with additional validation    const result = await db.collection("applications").updateOne(

    console.log(`[DEBUG] Opdaterer ansøgning ${sanitizedId} med status: ${status}`)      { 

    console.log(`[DEBUG] Original app status: ${originalApp.status}`)        id: sanitizedId,

    console.log(`[DEBUG] Update data:`, updateData)        status: { $in: ["pending", "approved", "rejected"] } // Ensure valid current status

          }, 

    const result = await db.collection("applications").updateOne(      { $set: updateData }

      {     )

        id: sanitizedId,    

        status: { $in: ["pending", "approved", "rejected"] } // Ensure valid current status    console.log(`[DEBUG] Database update result - matchedCount: ${result.matchedCount}, modifiedCount: ${result.modifiedCount}`)

      },     

      { $set: updateData }    if (result.matchedCount === 0) {

    )      return NextResponse.json({ error: "Ansøgning ikke fundet eller allerede behandlet" }, { status: 404 })

        }

    console.log(`[DEBUG] Database update result - matchedCount: ${result.matchedCount}, modifiedCount: ${result.modifiedCount}`)    

        // Hent opdateret ansøgning med sanitized query

    if (result.modifiedCount === 0) {    const updated = await db.collection("applications").findOne({ id: sanitizedId })

      console.log(`[WARNING] Ingen ændringer i database for ID: ${sanitizedId}`)    if (!updated) {

      // Tjek om ansøgningen stadig eksisterer      return NextResponse.json({ error: "Kunne ikke hente opdateret ansøgning" }, { status: 404 })

      const checkApp = await db.collection("applications").findOne({ id: sanitizedId })    }

      console.log(`[DEBUG] Ansøgning efter update forsøg:`, checkApp ? `Status: ${checkApp.status}` : "IKKE FUNDET")    // Håndter Discord integration baseret på status

    }    if (updated.status === "approved" || updated.status === "rejected") {

          const botToken = process.env.DISCORD_BOT_TOKEN

    if (result.matchedCount === 0) {      const guildId = process.env.DISCORD_GUILD_ID

      return NextResponse.json({ error: "Ansøgning ikke fundet eller allerede behandlet" }, { status: 404 })      const webhookUrl = process.env.DISCORD_WEBHOOK_URL

    }      

          if (botToken && guildId) {

    // Hent opdateret ansøgning med sanitized query        try {

    const updated = await db.collection("applications").findOne({ id: sanitizedId })          if (updated.status === "approved") {

    if (!updated) {            // Send kun webhook besked for whitelist godkendelser

      return NextResponse.json({ error: "Kunne ikke hente opdateret ansøgning" }, { status: 404 })            if (webhookUrl && updated.type === "whitelist") {

    }              const mention = `<@${updated.discordId}>`

              const besked = `${mention} - Din ${updated.type} ansøgning er godkendt!`

    console.log(`[DEBUG] Ansøgning opdateret! Ny status: ${updated.status}`)              

                  await fetch(webhookUrl, {

    // Håndter Discord integration baseret på status                method: "POST",

    if (updated.status === "approved" || updated.status === "rejected") {                headers: { "Content-Type": "application/json" },

      const botToken = process.env.DISCORD_BOT_TOKEN                body: JSON.stringify({ content: besked })

      const guildId = process.env.DISCORD_GUILD_ID              })

      const webhookUrl = process.env.DISCORD_WEBHOOK_URL            }

      

      console.log(`[DEBUG] Discord integration - Bot token: ${botToken ? 'SAT' : 'MANGLER'}, Guild ID: ${guildId ? 'SAT' : 'MANGLER'}`)            // Giv kun whitelist rolle automatisk

                  if (updated.type === "whitelist") {

      if (botToken && guildId) {              const whitelistRoleId = process.env.DISCORD_WHITELIST_ROLE_ID

        try {              

          if (updated.status === "approved") {              if (whitelistRoleId) {

            console.log(`[DEBUG] Behandler godkendelse for ${updated.type} ansøgning`)                await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${updated.discordId}/roles/${whitelistRoleId}`, {

                              method: "PUT",

            // Send kun webhook besked for whitelist godkendelser                  headers: {

            if (webhookUrl && updated.type === "whitelist") {                    "Authorization": `Bot ${botToken}`,

              const mention = `<@${updated.discordId}>`                    "Content-Type": "application/json"

              const besked = `${mention} - Din ${updated.type} ansøgning er godkendt!`                  }

                              })

              await fetch(webhookUrl, {                console.log(`✅ Gav whitelist rolle til ${updated.discordName}`)

                method: "POST",              }

                headers: { "Content-Type": "application/json" },            }

                body: JSON.stringify({ content: besked })

              })            // Opret privat kanal for visse ansøgningstyper (inkl. wlmodtager)

              console.log(`[DEBUG] Webhook besked sendt for whitelist godkendelse`)            const channelTypes = ["bande", "firma", "staff", "wlmodtager", "cc", "Betatester"]

            }            console.log(`[DEBUG] Godkendt ${updated.type} ansøgning - skal oprette kanal: ${channelTypes.includes(updated.type)}`)

            if (channelTypes.includes(updated.type)) {

            // Giv kun whitelist rolle automatisk              const categoryMapping: { [key: string]: string } = {

            if (updated.type === "whitelist") {                bande: process.env.DISCORD_BANDE_CATEGORY_ID || "",

              const whitelistRoleId = process.env.DISCORD_WHITELIST_ROLE_ID                firma: process.env.DISCORD_FIRMA_CATEGORY_ID || "",

                              staff: process.env.DISCORD_STAFF_CATEGORY_ID || "",

              if (whitelistRoleId) {                wlmodtager: process.env.DISCORD_WLMODTAGER_CATEGORY_ID || "",

                console.log(`[DEBUG] Tildeler whitelist rolle: ${whitelistRoleId}`)                cc: process.env.DISCORD_CC_CATEGORY_ID || "",

                const roleResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${updated.discordId}/roles/${whitelistRoleId}`, {                Betatester: process.env.DISCORD_BETATEST_CATEGORY_ID || ""

                  method: "PUT",              }

                  headers: {              

                    "Authorization": `Bot ${botToken}`,              const categoryId = categoryMapping[updated.type]

                    "Content-Type": "application/json"              const channelName = `${updated.type}-${updated.discordName.split('#')[0].toLowerCase()}`

                  }              

                })              console.log(`[DEBUG] Category ID for ${updated.type}: ${categoryId}`)

                              console.log(`[DEBUG] Channel navn: ${channelName}`)

                if (roleResponse.ok) {              

                  console.log(`✅ Gav whitelist rolle til ${updated.discordName}`)              if (categoryId) {

                } else {                const channelResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {

                  console.log(`❌ Fejl ved rolle tildeling: ${roleResponse.status} ${roleResponse.statusText}`)                  method: "POST",

                }                  headers: {

              } else {                    "Authorization": `Bot ${botToken}`,

                console.log(`[WARNING] DISCORD_WHITELIST_ROLE_ID ikke sat`)                    "Content-Type": "application/json"

              }                  },

            }                  body: JSON.stringify({

                    name: channelName,

            // Opret privat kanal for visse ansøgningstyper (inkl. wlmodtager)                    type: 0, // Text channel

            const channelTypes = ["bande", "firma", "staff", "wlmodtager", "cc", "Betatester"]                    parent_id: categoryId,

            console.log(`[DEBUG] Godkendt ${updated.type} ansøgning - skal oprette kanal: ${channelTypes.includes(updated.type)}`)                    permission_overwrites: [

                                  {

            if (channelTypes.includes(updated.type)) {                        id: guildId, // @everyone

              const categoryMapping: { [key: string]: string } = {                        type: 0,

                bande: process.env.DISCORD_BANDE_CATEGORY_ID || "",                        deny: "1024" // VIEW_CHANNEL

                firma: process.env.DISCORD_FIRMA_CATEGORY_ID || "",                      },

                staff: process.env.DISCORD_STAFF_CATEGORY_ID || "",                      {

                wlmodtager: process.env.DISCORD_WLMODTAGER_CATEGORY_ID || "",                        id: updated.discordId, // User

                cc: process.env.DISCORD_CC_CATEGORY_ID || "",                        type: 1,

                Betatester: process.env.DISCORD_BETATEST_CATEGORY_ID || ""                        allow: "1024" // VIEW_CHANNEL

              }                      }

                                  ]

              const categoryId = categoryMapping[updated.type]                  })

              const channelName = `${updated.type}-${updated.discordName.split('#')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')}`                })

                              

              console.log(`[DEBUG] Category ID for ${updated.type}: ${categoryId || 'IKKE SAT'}`)                if (channelResponse.ok) {

              console.log(`[DEBUG] Channel navn: ${channelName}`)                  const newChannel = await channelResponse.json()

                                console.log(`✅ Oprettede kanal: ${channelName}`)

              if (categoryId && categoryId !== "your_" + updated.type.toLowerCase() + "_category_id") {                  

                console.log(`[DEBUG] Opretter kanal i kategori: ${categoryId}`)                  // Send besked i den nyoprettede kanal

                                  const responsibleRoleMapping: { [key: string]: string } = {

                const channelResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {                    bande: process.env.DISCORD_BANDE_RESPONSIBLE_ROLE_ID || "",

                  method: "POST",                    firma: process.env.DISCORD_FIRMA_RESPONSIBLE_ROLE_ID || "",

                  headers: {                    staff: process.env.DISCORD_STAFF_RESPONSIBLE_ROLE_ID || "",

                    "Authorization": `Bot ${botToken}`,                    wlmodtager: process.env.DISCORD_WLMODTAGER_RESPONSIBLE_ROLE_ID || "",

                    "Content-Type": "application/json"                    cc: process.env.DISCORD_CC_RESPONSIBLE_ROLE_ID || "",

                  },                    Betatester: process.env.DISCORD_BETATEST_RESPONSIBLE_ROLE_ID || ""

                  body: JSON.stringify({                  }

                    name: channelName,                  

                    type: 0, // Text channel                  const responsibleRoleId = responsibleRoleMapping[updated.type]

                    parent_id: categoryId,                  if (responsibleRoleId) {

                    permission_overwrites: [                    // SECURITY: Sanitize all user data in Discord messages

                      {                    const sanitizedUsername = sanitizeInput(updated.discordName.split('#')[0])

                        id: guildId, // @everyone                    

                        type: 0,                    // Sanitize application fields to prevent @everyone/@here mentions

                        deny: "1024" // VIEW_CHANNEL                    const sanitizedFields = Object.entries(updated.fields)

                      },                      .map(([key, value]) => {

                      {                        const sanitizedKey = sanitizeInput(key)

                        id: updated.discordId, // User                        const sanitizedValue = sanitizeInput(String(value))

                        type: 1,                        return `**${sanitizedKey}:** ${sanitizedValue}`

                        allow: "1024" // VIEW_CHANNEL                      })

                      }                      .join("\n")

                    ]                    

                  })                    const welcomeMessage = `## Hej, ${sanitizedUsername}.\nDin ansøgning er blevet læst og godkendt.\nI denne kanal vil du kunne skrive med en ansvarlig, så I kan finde ud af hvad der skal ske nu.\n\n<@&${responsibleRoleId}>\n\n> Din ansøgning:\n${sanitizedFields}`

                })                    

                                    await fetch(`https://discord.com/api/v10/channels/${newChannel.id}/messages`, {

                if (channelResponse.ok) {                      method: "POST",

                  const newChannel = await channelResponse.json()                      headers: {

                  console.log(`✅ Oprettede kanal: ${channelName} (ID: ${newChannel.id})`)                        "Authorization": `Bot ${botToken}`,

                                          "Content-Type": "application/json"

                  // Send besked i den nyoprettede kanal                      },

                  const responsibleRoleMapping: { [key: string]: string } = {                      body: JSON.stringify({

                    bande: process.env.DISCORD_BANDE_RESPONSIBLE_ROLE_ID || "",                        content: welcomeMessage

                    firma: process.env.DISCORD_FIRMA_RESPONSIBLE_ROLE_ID || "",                      })

                    staff: process.env.DISCORD_STAFF_RESPONSIBLE_ROLE_ID || "",                    })

                    wlmodtager: process.env.DISCORD_WLMODTAGER_RESPONSIBLE_ROLE_ID || "",                    

                    cc: process.env.DISCORD_CC_RESPONSIBLE_ROLE_ID || "",                    console.log(`✅ Sendte velkomstbesked i kanal: ${channelName}`)

                    Betatester: process.env.DISCORD_BETATEST_RESPONSIBLE_ROLE_ID || ""                  }

                  }                }

                                }

                  const responsibleRoleId = responsibleRoleMapping[updated.type]            }

                  console.log(`[DEBUG] Responsible rolle for ${updated.type}: ${responsibleRoleId || 'IKKE SAT'}`)            

                            } else if (updated.status === "rejected") {

                  if (responsibleRoleId && responsibleRoleId !== "your_" + updated.type.toLowerCase() + "_responsible_role_id") {            // Send webhook besked for whitelist afvisninger

                    // SECURITY: Sanitize all user data in Discord messages            if (webhookUrl && updated.type === "whitelist") {

                    const sanitizedUsername = sanitizeInput(updated.discordName.split('#')[0])              const mention = `<@${updated.discordId}>`

                                  const besked = `${mention} - Din whitelist ansøgning er afvist!`

                    // Sanitize application fields to prevent @everyone/@here mentions              

                    const sanitizedFields = Object.entries(updated.fields)              await fetch(webhookUrl, {

                      .map(([key, value]) => {                method: "POST",

                        const sanitizedKey = sanitizeInput(key)                headers: { "Content-Type": "application/json" },

                        const sanitizedValue = sanitizeInput(String(value))                body: JSON.stringify({ content: besked })

                        return `**${sanitizedKey}:** ${sanitizedValue}`              })

                      })            }

                      .join("\\n")

                                // Send DM til bruger med afvisningsgrund

                    const welcomeMessage = `## Hej, ${sanitizedUsername}.\\nDin ansøgning er blevet læst og godkendt.\\nI denne kanal vil du kunne skrive med en ansvarlig, så I kan finde ud af hvad der skal ske nu.\\n\\n<@&${responsibleRoleId}>\\n\\n> Din ansøgning:\\n${sanitizedFields}`            try {

                                  // Opret DM kanal

                    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${newChannel.id}/messages`, {              const dmResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {

                      method: "POST",                method: "POST",

                      headers: {                headers: {

                        "Authorization": `Bot ${botToken}`,                  "Authorization": `Bot ${botToken}`,

                        "Content-Type": "application/json"                  "Content-Type": "application/json"

                      },                },

                      body: JSON.stringify({                body: JSON.stringify({

                        content: welcomeMessage                  recipient_id: updated.discordId

                      })                })

                    })              })

                                  

                    if (messageResponse.ok) {              if (dmResponse.ok) {

                      console.log(`✅ Sendte velkomstbesked i kanal: ${channelName}`)                const dmChannel = await dmResponse.json()

                    } else {                

                      console.log(`❌ Fejl ved afsendelse af velkomstbesked: ${messageResponse.status} ${messageResponse.statusText}`)                // Send afvisnings besked i nyt format

                    }                const getApplicationTypeName = (type: string) => {

                  } else {                  const typeNames: { [key: string]: string } = {

                    console.log(`[WARNING] Responsible role ID ikke korrekt sat for ${updated.type}`)                    whitelist: "Whitelist Ansøgning",

                  }                    staff: "Staff Ansøgning", 

                } else {                    wlmodtager: "Whitelist Modtager",

                  const errorText = await channelResponse.text()                    cc: "Content Creator Ansøgning",

                  console.log(`❌ Fejl ved kanal oprettelse: ${channelResponse.status} ${channelResponse.statusText} - ${errorText}`)                    bande: "Bande Ansøgning",

                }                    firma: "Firma Ansøgning"

              } else {                  }

                console.log(`[WARNING] Category ID ikke korrekt sat for ${updated.type}`)                  return typeNames[type] || type

              }                }

            }                

                            const rejectionMessage = `Hej ${updated.discordName.split('#')[0]}.\nVi har læst din ansøgning igennem, og bliver desværre nød til at afvise dig i denne omgang.\n**Ansøgning:** ${getApplicationTypeName(updated.type)}\n**Grundlag:** ${updated.rejectionReason || "Ikke angivet"}\n\n> Du er velkommen til at ansøge igen om 24 timer.\n- Division`

          } else if (updated.status === "rejected") {                

            console.log(`[DEBUG] Behandler afvisning for ${updated.type} ansøgning`)                await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {

                              method: "POST",

            // Send webhook besked for whitelist afvisninger                  headers: {

            if (webhookUrl && updated.type === "whitelist") {                    "Authorization": `Bot ${botToken}`,

              const mention = `<@${updated.discordId}>`                    "Content-Type": "application/json"

              const besked = `${mention} - Din whitelist ansøgning er afvist!`                  },

                                body: JSON.stringify({

              await fetch(webhookUrl, {                    content: rejectionMessage

                method: "POST",                  })

                headers: { "Content-Type": "application/json" },                })

                body: JSON.stringify({ content: besked })                

              })                console.log(`✅ Sendte afvisnings DM til ${updated.discordName}`)

              console.log(`[DEBUG] Webhook besked sendt for whitelist afvisning`)              }

            }            } catch (dmError) {

              console.error("Fejl ved afsendelse af DM:", dmError)

            // Send DM til bruger med afvisningsgrund            }

            try {          }

              console.log(`[DEBUG] Sender DM til ${updated.discordName}`)          

              // Opret DM kanal        } catch (error) {

              const dmResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {          console.error("Fejl ved Discord integration:", error)

                method: "POST",        }

                headers: {      }

                  "Authorization": `Bot ${botToken}`,    }

                  "Content-Type": "application/json"

                },    // Send secure log til Discord om admin handling - brug specifik webhook for hver type

                body: JSON.stringify({    if (verifiedAdmin) {

                  recipient_id: updated.discordId      try {

                })        // Vælg den rigtige webhook baseret på ansøgningstype

              })        const webhookMapping: { [key: string]: string } = {

                        whitelist: process.env.DISCORD_WHITELIST_LOGS_WEBHOOK_URL || "",

              if (dmResponse.ok) {          staff: process.env.DISCORD_STAFF_LOGS_WEBHOOK_URL || "",

                const dmChannel = await dmResponse.json()          wlmodtager: process.env.DISCORD_WLMODTAGER_LOGS_WEBHOOK_URL || "",

                          cc: process.env.DISCORD_CC_LOGS_WEBHOOK_URL || "",

                // Send afvisnings besked i nyt format          bande: process.env.DISCORD_BANDE_LOGS_WEBHOOK_URL || "",

                const getApplicationTypeName = (type: string) => {          firma: process.env.DISCORD_FIRMA_LOGS_WEBHOOK_URL || "",

                  const typeNames: { [key: string]: string } = {          Betatester: process.env.DISCORD_BETATEST_LOGS_WEBHOOK_URL || ""

                    whitelist: "Whitelist Ansøgning",        }

                    staff: "Staff Ansøgning",         

                    wlmodtager: "Whitelist Modtager",        const specificWebhookUrl = webhookMapping[updated.type]

                    cc: "Content Creator Ansøgning",        const fallbackWebhookUrl = process.env.DISCORD_LOGS_WEBHOOK_URL

                    bande: "Bande Ansøgning",        const logsWebhookUrl = specificWebhookUrl || fallbackWebhookUrl

                    firma: "Firma Ansøgning",        

                    Betatester: "Beta Tester Ansøgning"        if (logsWebhookUrl) {

                  }          const getApplicationTypeName = (type: string) => {

                  return typeNames[type] || type            const typeNames: { [key: string]: string } = {

                }              whitelist: "Whitelist Ansøgning",

                              staff: "Staff Ansøgning", 

                const rejectionMessage = `Hej ${updated.discordName.split('#')[0]}.\\nVi har læst din ansøgning igennem, og bliver desværre nød til at afvise dig i denne omgang.\\n**Ansøgning:** ${getApplicationTypeName(updated.type)}\\n**Grundlag:** ${updated.rejectionReason || "Ikke angivet"}\\n\\n> Du er velkommen til at ansøge igen om 24 timer.\\n- Division`              wlmodtager: "Whitelist Modtager",

                              cc: "Content Creator Ansøgning",

                const dmMessageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {              bande: "Bande Ansøgning",

                  method: "POST",              firma: "Firma Ansøgning"

                  headers: {            }

                    "Authorization": `Bot ${botToken}`,            return typeNames[type] || type

                    "Content-Type": "application/json"          }

                  },

                  body: JSON.stringify({          const statusEmoji = updated.status === "approved" ? "✅" : updated.status === "rejected" ? "❌" : "⏳"

                    content: rejectionMessage          const statusText = updated.status === "approved" ? "GODKENDT" : updated.status === "rejected" ? "AFVIST" : "AFVENTENDE"

                  })          

                })          // SECURITY: Sanitize all user-controlled data in Discord messages

                          const sanitizedAdminName = sanitizeInput(verifiedAdmin!.discordName)

                if (dmMessageResponse.ok) {          const sanitizedApplicantName = sanitizeInput(updated.discordName)

                  console.log(`✅ Sendte afvisnings DM til ${updated.discordName}`)          const sanitizedApplicationType = sanitizeInput(getApplicationTypeName(updated.type))

                } else {          const sanitizedRejectionReason = updated.rejectionReason ? sanitizeInput(updated.rejectionReason) : null

                  console.log(`❌ Fejl ved afsendelse af DM: ${dmMessageResponse.status} ${dmMessageResponse.statusText}`)          

                }          let logMessage = `${statusEmoji} **ANSØGNING ${statusText}**\n\n`

              } else {          logMessage += `**Admin:** <@${verifiedAdmin!.discordId}> (${sanitizedAdminName})\n`

                console.log(`❌ Kunne ikke oprette DM kanal: ${dmResponse.status} ${dmResponse.statusText}`)          logMessage += `**Ansøger:** <@${updated.discordId}> (${sanitizedApplicantName})\n`

              }          logMessage += `**Type:** ${sanitizedApplicationType}\n`

            } catch (dmError) {          logMessage += `**Ansøgnings ID:** ${sanitizeInput(updated.id)}\n`

              console.error("Fejl ved afsendelse af DM:", dmError)          logMessage += `**Tid:** <t:${Math.floor(Date.now() / 1000)}:F>\n`

            }          

          }          if (updated.status === "rejected" && sanitizedRejectionReason) {

                      logMessage += `**Afvisningsgrund:** ${sanitizedRejectionReason}\n`

        } catch (error) {          }

          console.error("Fejl ved Discord integration:", error)

        }          await fetch(logsWebhookUrl, {

      } else {            method: "POST",

        console.log(`[WARNING] Discord integration ikke mulig - Bot token: ${botToken ? 'OK' : 'MANGLER'}, Guild ID: ${guildId ? 'OK' : 'MANGLER'}`)            headers: { "Content-Type": "application/json" },

      }            body: JSON.stringify({ 

    }              content: logMessage,

              username: `${getApplicationTypeName(updated.type)} Logger`,

    // Send secure log til Discord om admin handling              avatar_url: "https://cdn.discordapp.com/emojis/1234567890123456789.png" // Optional: Add a logger bot avatar

    if (verifiedAdmin) {            })

      try {          })

        const fallbackWebhookUrl = process.env.DISCORD_LOGS_WEBHOOK_URL          

                  const webhookType = specificWebhookUrl ? "specifik" : "fallback"

        if (fallbackWebhookUrl && fallbackWebhookUrl !== "your_logs_webhook_url") {          console.log(`📝 Loggede admin handling til ${webhookType} webhook: ${sanitizedAdminName} ${statusText} ${updated.type} ansøgning`)

          const getApplicationTypeName = (type: string) => {        }

            const typeNames: { [key: string]: string } = {      } catch (logError) {

              whitelist: "Whitelist Ansøgning",        console.error("Fejl ved logging:", logError)

              staff: "Staff Ansøgning",       }

              wlmodtager: "Whitelist Modtager",    }

              cc: "Content Creator Ansøgning",

              bande: "Bande Ansøgning",    return NextResponse.json({ success: true, application: updated })

              firma: "Firma Ansøgning",  } catch (error) {

              Betatester: "Beta Tester Ansøgning"    console.error("Failed to update application:", error)

            }    return NextResponse.json({ error: "Failed to update application" }, { status: 500 })

            return typeNames[type] || type  }

          }}


          const statusEmoji = updated.status === "approved" ? "✅" : updated.status === "rejected" ? "❌" : "⏳"
          const statusText = updated.status === "approved" ? "GODKENDT" : updated.status === "rejected" ? "AFVIST" : "AFVENTENDE"
          
          // SECURITY: Sanitize all user-controlled data in Discord messages
          const sanitizedAdminName = sanitizeInput(verifiedAdmin!.discordName)
          const sanitizedApplicantName = sanitizeInput(updated.discordName)
          const sanitizedApplicationType = sanitizeInput(getApplicationTypeName(updated.type))
          const sanitizedRejectionReason = updated.rejectionReason ? sanitizeInput(updated.rejectionReason) : null
          
          let logMessage = `${statusEmoji} **ANSØGNING ${statusText}**\\n\\n`
          logMessage += `**Admin:** <@${verifiedAdmin!.discordId}> (${sanitizedAdminName})\\n`
          logMessage += `**Ansøger:** <@${updated.discordId}> (${sanitizedApplicantName})\\n`
          logMessage += `**Type:** ${sanitizedApplicationType}\\n`
          logMessage += `**Ansøgnings ID:** ${sanitizeInput(updated.id)}\\n`
          logMessage += `**Tid:** <t:${Math.floor(Date.now() / 1000)}:F>\\n`
          
          if (updated.status === "rejected" && sanitizedRejectionReason) {
            logMessage += `**Afvisningsgrund:** ${sanitizedRejectionReason}\\n`
          }

          const logResponse = await fetch(fallbackWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              content: logMessage,
              username: `${getApplicationTypeName(updated.type)} Logger`
            })
          })
          
          if (logResponse.ok) {
            console.log(`📝 Loggede admin handling til webhook: ${sanitizedAdminName} ${statusText} ${updated.type} ansøgning`)
          } else {
            console.log(`❌ Fejl ved logging: ${logResponse.status} ${logResponse.statusText}`)
          }
        } else {
          console.log(`[WARNING] Logs webhook ikke konfigureret`)
        }
      } catch (logError) {
        console.error("Fejl ved logging:", logError)
      }
    }

    console.log(`[DEBUG] Returnerer opdateret ansøgning med status: ${updated.status}`)
    return NextResponse.json({ success: true, application: updated })
    
  } catch (error) {
    console.error("Failed to update application:", error)
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 })
  }
}