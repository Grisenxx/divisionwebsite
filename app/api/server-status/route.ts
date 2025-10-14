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

  if (!botToken || !guildId) {
    return { discordMembers: null, whitelistedMembers: null }
  }

  try {
    // Get guild info with member counts
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
      return { discordMembers: null, whitelistedMembers: null }
    }

    const guild: DiscordGuild = await guildResponse.json()

    // Get ALL members to count whitelisted properly
    let whitelistedCount = 0
    let afterId = ""
    
    // Paginate through all members
    while (true) {
      const url = afterId 
        ? `https://discord.com/api/v10/guilds/${guildId}/members?limit=1500&after=${afterId}`
        : `https://discord.com/api/v10/guilds/${guildId}/members?limit=1500`
      
      const membersResponse = await fetch(url, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!membersResponse.ok) {
        break
      }

      const members: DiscordMember[] = await membersResponse.json()
      if (members.length === 0) {
        break
      }
      
      // Count whitelisted in this batch
      const batchWhitelisted = members.filter(member => 
        member.roles && member.roles.includes(whitelistedRoleId)
      ).length
      
      whitelistedCount += batchWhitelisted
      
      // Set up for next batch
      afterId = members[members.length - 1]?.user?.id || ""
      
      // If we got fewer than 1000 members, we've reached the end
      if (members.length < 1000) {
        break
      }
    }
    
    return {
      discordMembers: guild.approximate_member_count || null,
      whitelistedMembers: whitelistedCount > 0 ? whitelistedCount : null,
    }
  } catch (error) {
    return { discordMembers: null, whitelistedMembers: null }
  }
}

export async function GET() {
  const serverIp = process.env.FIVEM_SERVER_IP
  const serverPort = process.env.FIVEM_SERVER_PORT || "30120"

  // Get Discord stats
  const discordStats = await getDiscordStats()

  // If server IP is not configured, return offline status
  if (!serverIp) {
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
      throw new Error("Invalid players JSON")
    }

    try {
      info = JSON.parse(infoText)
    } catch (e) {
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


