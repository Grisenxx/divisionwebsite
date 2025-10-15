import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import clientPromise from "@/lib/mongodb"
import { verifyAdminAuth, rateLimit } from "@/lib/security"
import { sanitizeInput, sanitizeMongoQuery, generateSecureId } from "@/lib/validation"

const applications: any[] = []
const applicationTimestamps: Map<string, number> = new Map()

export async function GET(request: NextRequest) {
  try {
    // Rate limiting for GET requests
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = rateLimit(ip, 20, 60000) // 20 requests per minute for listing
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: "For mange requests. Prøv igen senere." },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // CRITICAL: Verify admin authentication for accessing applications
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json(
        { error: "Adgang nægtet. Kun administratorer kan se ansøgninger." },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const client = await clientPromise
    const db = client.db("divisionhjemmeside")
    
    // Secure query building
    let query: any = {}
    if (type) {
      const sanitizedType = sanitizeInput(type)
      // Validate application type against allowed types
      const allowedTypes = ["whitelist", "staff", "wlmodtager", "cc", "bande", "firma"]
      if (allowedTypes.includes(sanitizedType)) {
        query.type = sanitizedType
      } else {
        return NextResponse.json({ error: "Ugyldig ansøgningstype" }, { status: 400 })
      }
    }
    
    // Sanitize MongoDB query
    const sanitizedQuery = sanitizeMongoQuery(query)
    
    // Fetch applications with projection to limit exposed data
    const applications = await db.collection("applications")
      .find(sanitizedQuery)
      .project({
        _id: 0, // Don't expose internal MongoDB _id
        id: 1,
        type: 1,
        discordId: 1,
        discordName: 1,
        discordAvatar: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        updatedBy: 1,
        fields: 1,
        rejectionReason: 1
      })
      .sort({ createdAt: -1 }) // Newest first
      .limit(100) // Prevent excessive data exposure
      .toArray()

    return NextResponse.json(applications)
  } catch (err) {
    console.error("MongoDB fetch error:", err)
    return NextResponse.json({ error: "Databasefejl" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for application submissions
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = rateLimit(ip, 3, 300000) // Max 3 applications per 5 minutes
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: "For mange ansøgninger på kort tid. Prøv igen senere." },
        { status: 429, headers: { 'Retry-After': '300' } }
      )
    }

    const data = await request.json()
    const { type, discordId, discordName, discordAvatar, fields } = data

    // CRITICAL: Verify session authenticity 
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie?.value || !discordId) {
      return NextResponse.json({ error: "Du skal være logget ind for at ansøge" }, { status: 401 })
    }

    // Validate session data matches submission
    let sessionData
    try {
      sessionData = JSON.parse(sessionCookie.value)
    } catch {
      return NextResponse.json({ error: "Ugyldig session" }, { status: 401 })
    }

    // SECURITY: Verify the Discord ID matches the session (prevent impersonation)
    if (sessionData.user?.id !== discordId) {
      return NextResponse.json({ error: "Session bruger mismatch" }, { status: 403 })
    }

    // Input validation and sanitization
    const allowedTypes = ["whitelist", "staff", "wlmodtager", "cc", "bande", "firma"]
    const sanitizedType = sanitizeInput(type)
    
    if (!allowedTypes.includes(sanitizedType)) {
      return NextResponse.json({ error: "Ugyldig ansøgningstype" }, { status: 400 })
    }

    if (!discordId.match(/^\d{17,19}$/)) {
      return NextResponse.json({ error: "Ugyldigt Discord ID format" }, { status: 400 })
    }

    // Sanitize all user input
    const sanitizedDiscordId = sanitizeInput(discordId)
    const sanitizedDiscordName = sanitizeInput(discordName)
    const sanitizedDiscordAvatar = discordAvatar ? sanitizeInput(discordAvatar) : ""
    
    // Sanitize application fields
    const sanitizedFields: { [key: string]: string } = {}
    for (const [key, value] of Object.entries(fields)) {
      const sanitizedKey = sanitizeInput(key)
      const sanitizedValue = sanitizeInput(String(value))
      
      // Limit field length to prevent abuse
      if (sanitizedValue.length > 2000) {
        return NextResponse.json({ 
          error: `Felt '${sanitizedKey}' er for langt (max 2000 tegn)` 
        }, { status: 400 })
      }
      
      sanitizedFields[sanitizedKey] = sanitizedValue
    }

    // Check application cooldown
    const lastApplicationKey = `${sanitizedDiscordId}-${sanitizedType}`
    const lastApplicationTime = applicationTimestamps.get(lastApplicationKey)
    const now = Date.now()
    const twentyFourHours = 24 * 60 * 60 * 1000

    if (lastApplicationTime && now - lastApplicationTime < twentyFourHours) {
      const timeRemaining = twentyFourHours - (now - lastApplicationTime)
      const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000))

      return NextResponse.json(
        {
          error: "Du har allerede ansøgt inden for de sidste 24 timer",
          timeRemaining: `${hoursRemaining} timer`,
        },
        { status: 429 },
      )
    }

    // Create secure application object
    const application = {
      id: generateSecureId(), // Use cryptographically secure ID generation
      type: sanitizedType,
      discordId: sanitizedDiscordId,
      discordName: sanitizedDiscordName,
      discordAvatar: sanitizedDiscordAvatar,
      fields: sanitizedFields,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    }

    // Gem ansøgning i MongoDB
    try {
      const client = await clientPromise
      const db = client.db("divisionhjemmeside")
      await db.collection("applications").insertOne(application)
    } catch (err) {
      console.error("MongoDB insert error:", err)
      return NextResponse.json({ error: "Databasefejl" }, { status: 500 })
    }

    applicationTimestamps.set(lastApplicationKey, now)
    console.log("[v0] New application received:", application)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save application:", error)
    return NextResponse.json({ error: "Der skete en fejl. Prøv igen senere." }, { status: 500 })
  }
}

export const PATCH = async (request: Request) => {
  try {
    const data = await request.json()
    const { id, status, adminName } = data // status: "approved" eller "rejected"

    const client = await clientPromise
    const db = client.db("divisionhjemmeside")
    // Opdater status
    await db.collection("applications").updateOne({ id }, { $set: { status } })
    // Hent opdateret ansøgning
    const updated = await db.collection("applications").findOne({ id })
    if (!updated) {
      return NextResponse.json({ error: "Ansøgning ikke fundet" }, { status: 404 })
    }
    // Send Discord webhook hvis whitelist og status er approved eller rejected
    if (updated.type === "whitelist" && (updated.status === "approved" || updated.status === "rejected")) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL
      const mention = `<@${updated.discordId}>`
      const besked = `${mention} - Din ansøgning er ${updated.status === "approved" ? "godkendt" : "afvist"}.`
      await fetch(webhookUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: besked })
      })
    }
    return NextResponse.json({ success: true, application: updated })
  } catch (error) {
    console.error("PATCH error:", error)
    return NextResponse.json({ error: "Der skete en fejl." }, { status: 500 })
  }
}