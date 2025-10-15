import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import clientPromise from "@/lib/mongodb"
import { verifyAdminAuth, rateLimit } from "@/lib/security"
import { sanitizeInput, sanitizeMongoQuery, generateSecureId, applicationSubmissionSchema } from "@/lib/validation"
import { detectAndBlockSpammer, isIpBlocked, createBlockedResponse } from "@/lib/spam-protection"

// In-memory fallback (for development only - production uses database)
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
    // Get IP address for security checks
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    // CRITICAL: Check if IP is already blocked for spam/abuse
    const blockCheck = await isIpBlocked(ip)
    if (blockCheck.blocked) {
      return createBlockedResponse(blockCheck.reason || "Security violation")
    }

    // Rate limiting for application submissions
    const rateLimitResult = rateLimit(ip, 3, 300000) // Max 3 applications per 5 minutes
    
    if (rateLimitResult.limited) {
      // Track rate limit violations for potential blocking
      await detectAndBlockSpammer(ip, 'unknown', 'rate_limit')
      
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

    // Comprehensive input validation
    try {
      applicationSubmissionSchema.parse({
        type,
        discordName,
        discordId,
        fields
      })
    } catch (validationError: any) {
      // Log validation failure for monitoring (don't auto-block for simple validation errors)
      console.log(`[VALIDATION] Validation error from IP ${ip.substring(0, 10)}...: ${validationError.errors?.[0]?.message || "Valideringsfejl"}`)
      
      return NextResponse.json({
        error: "Ugyldig ansøgningsdata",
        details: validationError.errors?.[0]?.message || "Valideringsfejl"
      }, { status: 400 })
    }

    // Input validation and sanitization
    const allowedTypes = ["whitelist", "staff", "wlmodtager", "cc", "bande", "firma", "Betatester"]
    const sanitizedType = sanitizeInput(type)
    
    if (!allowedTypes.includes(sanitizedType)) {
      return NextResponse.json({ error: "Ugyldig ansøgningstype" }, { status: 400 })
    }

    if (!discordId.match(/^\d{17,19}$/)) {
      return NextResponse.json({ error: "Ugyldigt Discord ID format" }, { status: 400 })
    }

    // CRITICAL: Block @everyone/@here in Discord names (primary attack vector)
    if (discordName.toLowerCase().includes('@everyone') || 
        discordName.toLowerCase().includes('@here') ||
        discordName.startsWith('@') ||
        discordName.includes('<@')) {
      
      // Immediately block spammer
      await detectAndBlockSpammer(ip, discordId, 'mention_spam')
      
      return NextResponse.json({
        error: "Ugyldigt Discord navn. @everyone/@here navne er ikke tilladt."
      }, { status: 403 })
    }

    // Sanitize all user input
    const sanitizedDiscordId = sanitizeInput(discordId)
    const sanitizedDiscordName = sanitizeInput(discordName)
    const sanitizedDiscordAvatar = discordAvatar ? sanitizeInput(discordAvatar) : ""
    
    // Sanitize application fields and block @everyone/@here attempts
    const sanitizedFields: { [key: string]: string } = {}
    for (const [key, value] of Object.entries(fields)) {
      const sanitizedKey = sanitizeInput(key)
      const sanitizedValue = sanitizeInput(String(value))
      
      // CRITICAL: Block and permanently ban @everyone/@here spammers
      if (String(value).toLowerCase().includes('@everyone') || 
          String(value).toLowerCase().includes('@here') ||
          String(value).includes('<@&') ||  // Role mentions
          String(value).match(/@[^\s]{10,}/)) { // Suspicious long mentions
        
        // Immediately block spammer
        await detectAndBlockSpammer(ip, sanitizedDiscordId, 'mention_spam')
        
        return NextResponse.json({
          error: "Ansøgninger må ikke indeholde Discord mentions. Din IP er nu blokeret."
        }, { status: 403 })
      }
      
      // Limit field length to prevent abuse
      if (sanitizedValue.length > 2000) {
        return NextResponse.json({ 
          error: `Felt '${sanitizedKey}' er for langt (max 2000 tegn)` 
        }, { status: 400 })
      }
      
      sanitizedFields[sanitizedKey] = sanitizedValue
    }

    // CRITICAL: Database-based duplicate and spam prevention 
    const client = await clientPromise
    const db = client.db("divisionhjemmeside")
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Check for recent applications from same user and type
    const recentApplication = await db.collection("applications").findOne({
      discordId: sanitizedDiscordId,
      type: sanitizedType,
      createdAt: { $gte: twentyFourHoursAgo.toISOString() }
    })

    if (recentApplication) {
      const timeRemaining = new Date(new Date(recentApplication.createdAt).getTime() + 24 * 60 * 60 * 1000)
      const hoursRemaining = Math.ceil((timeRemaining.getTime() - now.getTime()) / (60 * 60 * 1000))

      return NextResponse.json(
        {
          error: "Du har allerede ansøgt inden for de sidste 24 timer",
          timeRemaining: `${hoursRemaining} timer`,
        },
        { status: 429 },
      )
    }

    // Additional spam protection: Check for multiple applications from same IP in short time
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const recentIpApplications = await db.collection("application_submissions").countDocuments({
      ip: ip,
      timestamp: { $gte: fiveMinutesAgo }
    })

    if (recentIpApplications >= 3) {
      return NextResponse.json(
        { error: "For mange ansøgninger fra denne IP. Prøv igen om 5 minutter." },
        { status: 429 }
      )
    }

    // Log submission attempt for IP tracking
    await db.collection("application_submissions").insertOne({
      ip: ip,
      discordId: sanitizedDiscordId,
      type: sanitizedType,
      timestamp: now,
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

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

    // Save application to database
    try {
      await db.collection("applications").insertOne(application)
      console.log("[SECURITY] Application submitted:", { 
        type: sanitizedType, 
        discordId: sanitizedDiscordId,
        ip: ip.substring(0, 10) + "...", // Partial IP for logging
        timestamp: now
      })
    } catch (err) {
      console.error("MongoDB insert error:", err)
      return NextResponse.json({ error: "Databasefejl" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save application:", error)
    return NextResponse.json({ error: "Der skete en fejl. Prøv igen senere." }, { status: 500 })
  }
}

// SECURITY NOTE: PATCH endpoint removed - use /api/applications/[id]/route.ts for secure approval process
// This prevents bypassing of admin authentication and input sanitization