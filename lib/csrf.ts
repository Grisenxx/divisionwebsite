import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// CSRF Token Management
const csrfTokens = new Map<string, { token: string, timestamp: number }>()
const CSRF_TOKEN_EXPIRY = 1800000 // 30 minutes

// Generate cryptographically secure CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Validate CSRF token
export function validateCSRFToken(request: NextRequest): boolean {
  try {
    const token = request.headers.get('x-csrf-token') || 
                  request.headers.get('csrf-token') ||
                  request.cookies.get('csrf-token')?.value

    if (!token) {
      console.warn('CSRF: No token provided')
      return false
    }

    // Get session to associate token
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie?.value) {
      console.warn('CSRF: No session found')
      return false
    }

    const session = JSON.parse(sessionCookie.value)
    const sessionKey = session.user?.id || 'unknown'
    
    const storedTokenData = csrfTokens.get(sessionKey)
    if (!storedTokenData) {
      console.warn('CSRF: No stored token for session')
      return false
    }

    // Check token expiry
    if (Date.now() - storedTokenData.timestamp > CSRF_TOKEN_EXPIRY) {
      csrfTokens.delete(sessionKey)
      console.warn('CSRF: Token expired')
      return false
    }

    // Constant-time comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token, 'hex')
    const storedBuffer = Buffer.from(storedTokenData.token, 'hex')
    
    if (tokenBuffer.length !== storedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(tokenBuffer, storedBuffer)
  } catch (error) {
    console.error('CSRF token validation error:', error)
    return false
  }
}

// Store CSRF token for session
export function storeCSRFToken(sessionId: string, token: string): void {
  csrfTokens.set(sessionId, {
    token,
    timestamp: Date.now()
  })
}

// Clean up expired tokens
export function cleanupExpiredTokens(): void {
  const now = Date.now()
  for (const [sessionId, tokenData] of csrfTokens.entries()) {
    if (now - tokenData.timestamp > CSRF_TOKEN_EXPIRY) {
      csrfTokens.delete(sessionId)
    }
  }
}

// CSRF Protection Middleware
export function csrfProtection(request: NextRequest): NextResponse | null {
  // Only protect state-changing operations
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  
  if (!protectedMethods.includes(request.method)) {
    return null
  }

  // Skip CSRF for OAuth callbacks and other specific endpoints
  const skipPaths = ['/api/auth/callback', '/api/auth/discord', '/api/auth/me']
  const pathname = new URL(request.url).pathname
  
  if (skipPaths.some(path => pathname.startsWith(path))) {
    return null
  }

  if (!validateCSRFToken(request)) {
    return NextResponse.json(
      { error: "CSRF token ugyldig eller manglende" },
      { status: 403 }
    )
  }

  return null
}

// API endpoint for getting CSRF token
export async function getCSRFToken(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Ingen session fundet" }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const sessionId = session.user?.id || 'unknown'
    
    const token = generateCSRFToken()
    storeCSRFToken(sessionId, token)

    const response = NextResponse.json({ csrfToken: token })
    
    // Also set as HTTP-only cookie for additional security
    response.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1800, // 30 minutes
      path: '/'
    })

    return response
  } catch (error) {
    console.error('CSRF token generation error:', error)
    return NextResponse.json({ error: "Kunne ikke generere CSRF token" }, { status: 500 })
  }
}