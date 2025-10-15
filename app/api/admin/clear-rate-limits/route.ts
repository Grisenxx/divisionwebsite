import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyAdminAuth } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const client = await clientPromise
    const db = client.db("divisionhjemmeside")

    // Clear application_submissions collection (used for IP rate limiting)
    const submissionsResult = await db.collection("application_submissions").deleteMany({})
    
    console.log(`[ADMIN] Cleared ${submissionsResult.deletedCount} application submission records by admin ${authResult.user?.discordName}`)

    return NextResponse.json({
      success: true,
      message: "Rate limit data cleared",
      deletedSubmissions: submissionsResult.deletedCount
    })
  } catch (error) {
    console.error("Failed to clear rate limits:", error)
    return NextResponse.json({ error: "Failed to clear rate limits" }, { status: 500 })
  }
}