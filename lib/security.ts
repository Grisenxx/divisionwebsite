import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

// Verify admin authentication with proper server-side role checking
export async function verifyAdminAuth(request: NextRequest, adminInfo?: any) {
  try {
    // First verify session
    const sessionResult = await verifyAdminSession(request)
    if (sessionResult.error) {
      return sessionResult
    }

    // Get user from session
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie?.value) {
      return { error: "Ingen gyldig session", status: 401 }
    }

    const session = JSON.parse(sessionCookie.value)
    const user = session.user

    if (!user?.id?.match(/^\d{17,19}$/)) {
      return { error: "Ugyldigt Discord ID format", status: 400 }
    }

    // CRITICAL: Verify roles server-side via Discord API
    const botToken = process.env.DISCORD_BOT_TOKEN
    const guildId = process.env.DISCORD_GUILD_ID
    const adminRoleIds = process.env.ADMIN_ROLE_IDS?.split(',') || ['1427634524673544232', '1427628590580895825', '1427973710249328692'] // Kun whitelist modtager, staff og beta test admin roller - IKKE grundlæggende whitelist

    if (!botToken || !guildId) {
      return { error: "Discord konfiguration mangler", status: 500 }
    }

    // Fetch current roles from Discord API (prevent role manipulation)
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    })

    if (!memberResponse.ok) {
      return { error: "Kunne ikke verificere brugerroller", status: 403 }
    }

    const memberData = await memberResponse.json()
    const currentRoles = memberData.roles || []

    // Check if user has any admin role
    const hasAdminRole = adminRoleIds.some(roleId => currentRoles.includes(roleId))
    
    // Debug logging
    console.log(`[DEBUG] User ${user.id} roles:`, currentRoles)
    console.log(`[DEBUG] Required admin roles:`, adminRoleIds)
    console.log(`[DEBUG] Has admin role:`, hasAdminRole)
    
    if (!hasAdminRole) {
      return { error: "Utilstrækkelige rettigheder", status: 403 }
    }

    // Return verified user data from Discord API (not from client)
    return { 
      user: {
        discordId: user.id,
        discordName: `${user.username}${user.discriminator && user.discriminator !== '0' ? `#${user.discriminator}` : ''}`,
        discordAvatar: user.avatar,
        roles: currentRoles
      }, 
      error: null 
    }
  } catch (error) {
    console.error('Admin auth verification error:', error)
    return { error: "Authentication fejlede", status: 401 }
  }
}

// Enhanced admin verification with session check
export async function verifyAdminSession(request: NextRequest) {
  try {
    // Get session cookie (updated from previous auth flow)
    const sessionCookie = request.cookies.get('session')
    
    if (!sessionCookie?.value) {
      return { error: "Ingen session fundet", status: 401 }
    }

    // Parse and validate session structure
    let session
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      return { error: "Ugyldig session format", status: 401 }
    }

    if (!session?.user?.id || !session?.accessToken) {
      return { error: "Ufuldstændig session data", status: 401 }
    }

    // Validate session against Discord API to prevent session manipulation
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
      signal: AbortSignal.timeout(5000)
    })

    if (!userResponse.ok) {
      return { error: "Session udløbet eller ugyldig", status: 401 }
    }

    const userData = await userResponse.json()
    
    // Verify session user matches Discord API response
    if (userData.id !== session.user.id) {
      return { error: "Session bruger mismatch", status: 401 }
    }
    
    return { authenticated: true, user: userData, error: null }
  } catch (error) {
    console.error('Session verification error:', error)
    return { error: "Session verificering fejlede", status: 401 }
  }
}

// Rate limiting middleware
const rateLimitMap = new Map()

export function rateLimit(ip: string, limit: number = 10, windowMs: number = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [])
  }
  
  const requests = rateLimitMap.get(ip).filter((time: number) => time > windowStart)
  
  if (requests.length >= limit) {
    return { limited: true, resetTime: windowStart + windowMs }
  }
  
  requests.push(now)
  rateLimitMap.set(ip, requests)
  
  return { limited: false }
}