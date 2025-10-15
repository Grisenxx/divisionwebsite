import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Automatic spam detection and blocking system
export async function detectAndBlockSpammer(
  ip: string, 
  discordId: string, 
  violationType: 'mention_spam' | 'rate_limit' | 'duplicate_submission' | 'malicious_content'
): Promise<boolean> {
  try {
    const client = await clientPromise
    const db = client.db("divisionhjemmeside")
    const now = new Date()

    // Record the violation
    await db.collection("security_violations").insertOne({
      ip: ip,
      discordId: discordId,
      violationType: violationType,
      timestamp: now,
      severity: getSeverityLevel(violationType)
    })

    // Count recent violations from this IP
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentViolations = await db.collection("security_violations").countDocuments({
      ip: ip,
      timestamp: { $gte: oneDayAgo }
    })

    // Auto-block IP if too many violations
    if (recentViolations >= 5 || violationType === 'mention_spam') {
      await db.collection("blocked_ips").insertOne({
        ip: ip,
        discordId: discordId,
        reason: `Auto-blocked: ${recentViolations} violations in 24h, latest: ${violationType}`,
        blockedAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        permanent: violationType === 'mention_spam' // Permanent ban for @everyone spam
      })

      console.warn(`[SECURITY] Auto-blocked IP ${ip.substring(0, 10)}... for ${violationType}`)
      return true
    }

    return false
  } catch (error) {
    console.error('Spam detection error:', error)
    return false
  }
}

function getSeverityLevel(violationType: string): number {
  switch (violationType) {
    case 'mention_spam': return 10 // Critical
    case 'malicious_content': return 8 // High  
    case 'rate_limit': return 5 // Medium
    case 'duplicate_submission': return 3 // Low
    default: return 1
  }
}

// Check if IP is blocked
export async function isIpBlocked(ip: string): Promise<{ blocked: boolean, reason?: string }> {
  try {
    const client = await clientPromise
    const db = client.db("divisionhjemmeside")
    const now = new Date()

    const blockRecord = await db.collection("blocked_ips").findOne({
      ip: ip,
      $or: [
        { permanent: true },
        { expiresAt: { $gte: now } }
      ]
    })

    if (blockRecord) {
      return { 
        blocked: true, 
        reason: blockRecord.reason || "IP blocked for security violations"
      }
    }

    return { blocked: false }
  } catch (error) {
    console.error('IP block check error:', error)
    return { blocked: false }
  }
}

// Block response helper
export function createBlockedResponse(reason: string): NextResponse {
  return NextResponse.json({
    error: "Din IP adresse er blokeret på grund af sikkerhedsovertrædelser",
    details: "Kontakt support hvis du mener dette er en fejl",
    blocked: true
  }, { 
    status: 403,
    headers: {
      'X-Blocked-Reason': reason,
      'Retry-After': '604800' // 7 days
    }
  })
}