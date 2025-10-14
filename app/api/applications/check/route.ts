import { NextResponse } from "next/server"

// Samme in-memory storage som i route.ts (i produktion: brug database)
const applicationTimestamps: Map<string, number> = new Map()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const userId = searchParams.get("userId")

  if (!type || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  const lastApplicationKey = `${userId}-${type}`
  const lastApplicationTime = applicationTimestamps.get(lastApplicationKey)
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000

  if (lastApplicationTime && now - lastApplicationTime < twentyFourHours) {
    const timeRemaining = twentyFourHours - (now - lastApplicationTime)
    const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000))

    return NextResponse.json({
      canApply: false,
      timeRemaining: `${hoursRemaining} timer`,
    })
  }

  return NextResponse.json({ canApply: true })
}
