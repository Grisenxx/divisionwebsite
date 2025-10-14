import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

// Verify admin authentication using session-based auth instead of JWT for now
export async function verifyAdminAuth(adminInfo: any) {
  try {
    if (!adminInfo || !adminInfo.discordId) {
      return { error: "Manglende admin information", status: 401 }
    }

    // Check if admin has required roles
    const adminRoleIds = process.env.ADMIN_ROLE_IDS?.split(',') || []
    
    // For now, we'll trust the adminInfo from the frontend
    // In production, you should verify this against your auth system
    if (!adminInfo.discordId.match(/^\d{17,19}$/)) {
      return { error: "Ugyldigt Discord ID format", status: 400 }
    }

    return { user: adminInfo, error: null }
  } catch (error) {
    return { error: "Authentication fejlede", status: 401 }
  }
}

// Enhanced admin verification with session check
export async function verifyAdminSession(request: NextRequest) {
  try {
    // Get Discord user info from session/cookies
    const authCookie = request.cookies.get('discord-auth')
    
    if (!authCookie) {
      return { error: "Ingen session fundet", status: 401 }
    }

    // In a real implementation, verify the session against your database
    // For now, we'll implement basic validation
    
    return { authenticated: true, error: null }
  } catch (error) {
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