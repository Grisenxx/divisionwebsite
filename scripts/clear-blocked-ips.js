// Emergency script to clear all rate limiting and blocked IPs
// Run this if spam protection has blocked too many legitimate users

import clientPromise from "../lib/mongodb.js"

async function clearAllRateLimits() {
  try {
    const client = await clientPromise
    const db = client.db("divisionwebsite")

    // Clear all blocked IPs
    const blockedResult = await db.collection("blocked_ips").deleteMany({})
    console.log(`Cleared ${blockedResult.deletedCount} blocked IPs`)

    // Clear all security violations
    const violationsResult = await db.collection("security_violations").deleteMany({})
    console.log(`Cleared ${violationsResult.deletedCount} security violations`)

    // Clear all application submission tracking (IP rate limiting)
    const submissionsResult = await db.collection("application_submissions").deleteMany({})
    console.log(`Cleared ${submissionsResult.deletedCount} application submission records`)

    console.log("✅ All IP blocks, security violations, and rate limits cleared!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error clearing rate limits:", error)
    process.exit(1)
  }
}

clearAllRateLimits()