import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import clientPromise from "@/lib/mongodb"

const applications: any[] = []
const applicationTimestamps: Map<string, number> = new Map()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  try {
    const client = await clientPromise
    const db = client.db("divisionhjemmeside")
    let query = {}
    if (type) {
      query = { type }
    }
    const applications = await db.collection("applications").find(query).toArray()
    return NextResponse.json(applications)
  } catch (err) {
    console.error("MongoDB fetch error:", err)
    return NextResponse.json({ error: "Databasefejl" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { type, discordId, discordName, discordAvatar, fields } = data

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie || !discordId) {
      return NextResponse.json({ error: "Du skal være logget ind for at ansøge" }, { status: 401 })
    }

    const lastApplicationKey = `${discordId}-${type}`
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

    const application = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      discordId,
      discordName,
      discordAvatar,
      fields,
      status: "pending",
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