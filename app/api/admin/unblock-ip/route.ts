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

    const { ip } = await request.json()

    if (!ip) {
      return NextResponse.json({ error: "IP adresse påkrævet" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("divisionwebsite")

    // Remove IP from blocked list
    const result = await db.collection("blocked_ips").deleteMany({ ip: ip })

    // Also clear security violations for this IP
    await db.collection("security_violations").deleteMany({ ip: ip })

    console.log(`[ADMIN] Unblocked IP ${ip} by admin ${authResult.user?.discordName}`)

    return NextResponse.json({
      success: true,
      message: `IP ${ip} er blevet unblocked`,
      deletedBlocks: result.deletedCount
    })
  } catch (error) {
    console.error("Failed to unblock IP:", error)
    return NextResponse.json({ error: "Failed to unblock IP" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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
    const db = client.db("divisionwebsite")

    // Get all blocked IPs
    const blockedIps = await db.collection("blocked_ips")
      .find({})
      .sort({ blockedAt: -1 })
      .limit(50)
      .toArray()

    return NextResponse.json(blockedIps)
  } catch (error) {
    console.error("Failed to get blocked IPs:", error)
    return NextResponse.json({ error: "Failed to get blocked IPs" }, { status: 500 })
  }
}