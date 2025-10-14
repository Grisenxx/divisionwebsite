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
    console.log("[Discord] Bot token or guild ID not configured")
    console.log(`[Discord] Bot token exists: ${!!botToken}, Guild ID exists: ${!!guildId}`)
    return { discordMembers: null, whitelistedMembers: null }
  }

  console.log(`[Discord] Starting API calls with Guild ID: ${guildId}`)
  console.log(`[Discord] Looking for role ID: ${whitelistedRoleId}`)

  try {
    // Get total member count
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!guildResponse.ok) {
      const errorText = await guildResponse.text()
      console.log(`[Discord] Guild API error: ${guildResponse.status} - ${errorText}`)
      throw new Error(`Discord API error: ${guildResponse.status}`)
    }

    const guild: DiscordGuild = await guildResponse.json()
    console.log(`[Discord] Successfully got guild info. Member count: ${guild.approximate_member_count}`)

    // Try to get role information - this is more efficient than paginating through all members
    let whitelistedCount = null
    
    try {
      // First try to get the role info to see if we can get member count
      const roleResponse = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/roles`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      )

      if (roleResponse.ok) {
        const roles: DiscordRole[] = await roleResponse.json()
        console.log(`[Discord] Found ${roles.length} roles in guild`)
        
        const whitelistedRole = roles.find(role => role.id === whitelistedRoleId)
        
        if (whitelistedRole) {
          console.log(`[Discord] Found whitelisted role: ${whitelistedRole.name}`)
          
          // Try multiple approaches to get member count
          let totalCount = 0
          let checkedMembers = 0
          
          // Method 1: Search through members in batches with proper pagination
          let afterId = ""
          let page = 0
          
          while (page < 5) { // Check up to 5000 members max
            const url = afterId 
              ? `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${afterId}`
              : `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`
            
            const membersResponse = await fetch(url, {
              headers: {
                Authorization: `Bot ${botToken}`,
              },
              signal: AbortSignal.timeout(15000),
            })
            
            if (!membersResponse.ok) {
              const errorText = await membersResponse.text()
              console.log(`[Discord] Members page ${page} failed: ${membersResponse.status} - ${errorText}`)
              break
            }
            
            const members: DiscordMember[] = await membersResponse.json()
            if (members.length === 0) break
            
            checkedMembers += members.length
            const batchCount = members.filter(member => 
              member.roles.includes(whitelistedRoleId)
            ).length
            
            totalCount += batchCount
            
            console.log(`[Discord] Page ${page}: ${batchCount} whitelisted in ${members.length} members`)
            
            // Set up for next page
            afterId = members[members.length - 1]?.user?.id || ""
            
            // If we got fewer than 1000 members, we've reached the end
            if (members.length < 1000) break
            
            page++
          }
          
          whitelistedCount = totalCount > 0 ? totalCount : null
          console.log(`[Discord] Total: ${whitelistedCount} whitelisted members found in ${checkedMembers} total members checked`)
        } else {
          console.log(`[Discord] Whitelisted role with ID ${whitelistedRoleId} not found`)
          console.log(`[Discord] Available roles:`, roles.map(r => `${r.name} (${r.id})`).slice(0, 5))
        }
      } else {
        const errorText = await roleResponse.text()
        console.log(`[Discord] Roles API error: ${roleResponse.status} - ${errorText}`)
      }
    } catch (error) {
      console.log("[Discord] Error getting role info:", error)
    }

    return {
      discordMembers: guild.approximate_member_count || null,
      whitelistedMembers: whitelistedCount,
    }
  } catch (error) {
    console.log("[Discord] Failed to fetch Discord stats:", error instanceof Error ? error.message : "Unknown error")
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


