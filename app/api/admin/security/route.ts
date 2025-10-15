import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyAdminAuth } from "@/lib/security"

// Admin endpoint to view security violations and blocked IPs
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json(
        { error: "Kun administratorer har adgang til sikkerhedslogger" },
        { status: authResult.status }
      )
    }

    const client = await clientPromise
    const db = client.db("divisionwebsite")
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'violations'

    if (type === 'blocked') {
      // Get blocked IPs
      const blockedIps = await db.collection("blocked_ips")
        .find({})
        .sort({ blockedAt: -1 })
        .limit(100)
        .toArray()

      return NextResponse.json({ 
        type: 'blocked_ips',
        data: blockedIps 
      })
    }

    // Default: Get security violations
    const violations = await db.collection("security_violations")
      .find({})
      .sort({ timestamp: -1 })
      .limit(200)
      .toArray()

    // Group violations by IP for summary
    const violationSummary = violations.reduce((acc: any, violation) => {
      const key = violation.ip
      if (!acc[key]) {
        acc[key] = {
          ip: violation.ip,
          discordId: violation.discordId,
          totalViolations: 0,
          violations: [],
          lastViolation: null
        }
      }
      acc[key].totalViolations++
      acc[key].violations.push(violation)
      if (!acc[key].lastViolation || violation.timestamp > acc[key].lastViolation) {
        acc[key].lastViolation = violation.timestamp
      }
      return acc
    }, {})

    return NextResponse.json({
      type: 'security_violations',
      summary: Object.values(violationSummary),
      recentViolations: violations.slice(0, 50)
    })

  } catch (error) {
    console.error('Security monitoring error:', error)
    return NextResponse.json(
      { error: "Kunne ikke hente sikkerhedsdata" },
      { status: 500 }
    )
  }
}

// Admin endpoint to unblock IPs or clear violations
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json(
        { error: "Kun administratorer kan fjerne blokeringer" },
        { status: authResult.status }
      )
    }

    const { ip, clearViolations } = await request.json()

    if (!ip) {
      return NextResponse.json(
        { error: "IP adresse påkrævet" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("divisionwebsite")

    // Remove IP block
    const deleteResult = await db.collection("blocked_ips").deleteMany({ ip })

    // Optionally clear violation history
    if (clearViolations) {
      await db.collection("security_violations").deleteMany({ ip })
    }

    console.log(`[ADMIN] Unblocked IP ${ip.substring(0, 10)}... by admin ${authResult.user?.discordId}`)

    return NextResponse.json({
      success: true,
      message: `IP ${ip} er blevet frigivet`,
      deletedBlocks: deleteResult.deletedCount
    })

  } catch (error) {
    console.error('IP unblock error:', error)
    return NextResponse.json(
      { error: "Kunne ikke fjerne blokering" },
      { status: 500 }
    )
  }
}