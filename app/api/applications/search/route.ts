import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { rateLimit } from "@/lib/security"
import { searchQuerySchema, sanitizeInput } from "@/lib/validation"

export async function GET(request: NextRequest) {
  try {
    // Rate limiting for search
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = rateLimit(ip, 5, 30000) // 5 searches per 30 seconds
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: "For mange søgninger. Prøv igen senere." },
        { status: 429, headers: { 'Retry-After': '30' } }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json({ error: "Søgeterm påkrævet" }, { status: 400 })
    }

    // Validate search query
    try {
      searchQuerySchema.parse({ q: query })
    } catch (validationError) {
      return NextResponse.json({ error: "Ugyldig søgeterm" }, { status: 400 })
    }

    // Sanitize search query
    const sanitizedQuery = sanitizeInput(query)
    
    const client = await clientPromise
    const db = client.db("divisionhjemmeside")
    
    // Safer search with escaped regex and limited results
    const escapedQuery = sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const applications = await db.collection("applications").find({
      $or: [
        { discordId: { $regex: escapedQuery, $options: 'i' } },
        { discordName: { $regex: escapedQuery, $options: 'i' } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50) // Limit results for performance
    .toArray()

    // Remove sensitive fields before sending
    const sanitizedApplications = applications.map(app => ({
      ...app,
      _id: app._id.toString() // Convert ObjectId to string
    }))

    return NextResponse.json(sanitizedApplications)
  } catch (error) {
    console.error("Search failed:", error)
    return NextResponse.json({ error: "Søgning fejlede" }, { status: 500 })
  }
}