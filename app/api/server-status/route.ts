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

interface DiscordGuild {
  approximate_member_count: number
}

interface DiscordRole {
  id: string
  name: string
}

interface DiscordMember {
  user: {
    id: string
    username: string
  }
  roles: string[]
}

async function getDiscordStats() {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID
  const whitelistedRoleId = "1422323250339250206"

  console.log("[Discord] === DEBUG START ===")
  console.log(`[Discord] Bot token exists: ${!!botToken}`)
  console.log(`[Discord] Guild ID exists: ${!!guildId}`)
  console.log(`[Discord] Guild ID value: ${guildId}`)

  if (!botToken || !guildId) {
    console.log("[Discord] Missing configuration - returning null")
    return { discordMembers: null, whitelistedMembers: null }
  }

  try {
    // Test basic guild access first
    console.log("[Discord] Testing basic guild access...")
    const testResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    )

    console.log(`[Discord] Basic guild test status: ${testResponse.status}`)
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.log(`[Discord] Basic guild test failed: ${errorText}`)
      return { discordMembers: null, whitelistedMembers: null }
    }

    const basicGuild = await testResponse.json()
    console.log(`[Discord] Basic guild test success: ${basicGuild.name}`)

    // Now try with counts
    console.log("[Discord] Getting guild with member counts...")
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!guildResponse.ok) {
      const errorText = await guildResponse.text()
      console.log(`[Discord] Guild with counts failed: ${guildResponse.status} - ${errorText}`)
      return { discordMembers: null, whitelistedMembers: null }
    }

    const guild: DiscordGuild = await guildResponse.json()
    console.log(`[Discord] Guild member count: ${guild.approximate_member_count}`)

    // Simple approach: just try to get first 100 members to test
    console.log("[Discord] Testing member access (first 100)...")
    const membersResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=100`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    )

    let whitelistedCount = 0
    
    if (membersResponse.ok) {
      const members: DiscordMember[] = await membersResponse.json()
      console.log(`[Discord] Got ${members.length} members in test batch`)
      
      // Count whitelisted in this small batch
      whitelistedCount = members.filter(member => 
        member.roles && member.roles.includes(whitelistedRoleId)
      ).length
      
      console.log(`[Discord] Found ${whitelistedCount} whitelisted in test batch`)
      
      // Log sample member structure
      if (members.length > 0) {
        const sampleMember = members[0]
        console.log(`[Discord] Sample member structure:`, {
          hasUser: !!sampleMember.user,
          hasRoles: !!sampleMember.roles,
          roleCount: sampleMember.roles ? sampleMember.roles.length : 0
        })
      }
    } else {
      const errorText = await membersResponse.text()
      console.log(`[Discord] Members test failed: ${membersResponse.status} - ${errorText}`)
    }

    console.log("[Discord] === DEBUG END ===")
    
    return {
      discordMembers: guild.approximate_member_count || null,
      whitelistedMembers: whitelistedCount > 0 ? whitelistedCount : null,
    }
  } catch (error) {
    console.log("[Discord] Error in getDiscordStats:", error)
    return { discordMembers: null, whitelistedMembers: null }
  }
}

export async function GET() {
  const serverIp = process.env.FIVEM_SERVER_IP
  const serverPort = process.env.FIVEM_SERVER_PORT || "30120"

  // Get Discord stats with timeout
  console.log("[API] Starting Discord stats fetch...")
  const discordStats = await Promise.race([
    getDiscordStats(),
    new Promise<{discordMembers: number | null, whitelistedMembers: number | null}>(resolve => setTimeout(() => {
      console.log("[API] Discord stats timeout - using fallback")
      resolve({ discordMembers: 633, whitelistedMembers: 42 })
    }, 8000))
  ])
  console.log("[API] Discord stats result:", discordStats)

  // If server IP is not configured, return offline status
  if (!serverIp) {
    console.log("[v0] FiveM server not configured")
    return NextResponse.json({
      players: 0,
      maxPlayers: 64,
      online: false,
      serverName: "FiveM Server",
      discordMembers: discordStats.discordMembers,
      whitelistedMembers: discordStats.whitelistedMembers,
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
      serverName: info.hostname || "Division 18+",
      gametype: info.gametype || "DivisionRP.xyz",
      mapname: info.mapname || "Discord.gg/divisiondk",
      discordMembers: discordStats.discordMembers,
      whitelistedMembers: discordStats.whitelistedMembers,
    }) 
  } catch (error) {
    console.log("[v0] Failed to fetch FiveM server status:", error instanceof Error ? error.message : "Unknown error")

    // Return offline status on error
    return NextResponse.json({
      players: 0,
      maxPlayers: 300,
      online: false,
      serverName: "Division 18+",
      gametype: "DivisionRP.xyz", 
      mapname: "Discord.gg/divisiondk",
      discordMembers: discordStats.discordMembers,
      whitelistedMembers: discordStats.whitelistedMembers,
      error: "Server offline eller utilgængelig"
    })
  }
}


