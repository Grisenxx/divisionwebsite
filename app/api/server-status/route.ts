import { NextResponse } from "next/server"

interface FiveMPlayer {
  name: string
  id: number
  identifiers: string[]
  ping: number
}

interface ServerInfo {
  hostname: string
  gametype: string
  mapname: string
  clients: number
  sv_maxclients: number
}

export async function GET() {
  const serverIp = process.env.FIVEM_SERVER_IP
  const serverPort = process.env.FIVEM_SERVER_PORT || "30120"

  // If server IP is not configured, return offline status
  if (!serverIp) {
    console.log("[v0] FiveM server not configured")
    return NextResponse.json({
      players: 0,
      maxPlayers: 64,
      online: false,
      serverName: "FiveM Server",
      error: "Server ikke konfigureret",
    })
  }

  try {
    // Fetch players with timeout
    const playersPromise = fetch(`http://${serverIp}:${serverPort}/players.json`, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    // Fetch server info with timeout
    const infoPromise = fetch(`http://${serverIp}:${serverPort}/info.json`, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    const [playersResponse, infoResponse] = await Promise.all([playersPromise, infoPromise])

    if (!playersResponse.ok || !infoResponse.ok) {
      throw new Error("Server returned error status")
    }

    // Check if response is valid JSON
    const playersText = await playersResponse.text()
    const infoText = await infoResponse.text()

    let players: FiveMPlayer[] = []
    let info: ServerInfo = { hostname: "", gametype: "", mapname: "", clients: 0, sv_maxclients: 300 }

    try {
      players = JSON.parse(playersText)
    } catch (e) {
      console.log("[v0] Invalid JSON in players response:", playersText.substring(0, 100))
      throw new Error("Invalid players JSON")
    }

    try {
      info = JSON.parse(infoText)
    } catch (e) {
      console.log("[v0] Invalid JSON in info response:", infoText.substring(0, 100))
      throw new Error("Invalid info JSON")
    }

    return NextResponse.json({
      players: players.length,
      maxPlayers: info.sv_maxclients || 300,
      online: true,
      serverName: info.hostname || "Division",
      gametype: info.gametype || "division 18+",
      mapname: info.mapname || "Discord.gg/divisiondk",
    }) 
  } catch (error) {
    console.log("[v0] Failed to fetch FiveM server status:", error instanceof Error ? error.message : "Unknown error")

    // Return offline status on error
    return NextResponse.json({
      players: 0,
      maxPlayers: 300,
      online: false,
      serverName: "Division",
      gametype: "division 18+", 
      mapname: "Discord.gg/divisiondk",
      error: "Server offline eller utilgængelig"
    })
  }
}


