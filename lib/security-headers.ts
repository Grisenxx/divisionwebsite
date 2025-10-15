import { NextRequest, NextResponse } from "next/server"

// Security headers configuration
export function addSecurityHeaders(response: NextResponse): void {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS filtering in browsers
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  
  // Content Security Policy - strict policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-* needed for React/Next.js dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.discordapp.com https://images.unsplash.com",
    "connect-src 'self' https://discord.com https://discordapp.com wss://gateway.discord.gg",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  // Referrer policy for privacy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Feature policy to restrict potentially dangerous features
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  
  // Prevent caching of sensitive responses
  if (response.headers.get('content-type')?.includes('application/json')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }
}

// Rate limiting headers
export function addRateLimitHeaders(response: NextResponse, limit: number, remaining: number, reset: number): void {
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', reset.toString())
}

// Security middleware that can be applied to routes
export function securityMiddleware(request: NextRequest): NextResponse | null {
  const url = new URL(request.url)
  
  // Block requests with suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // Script injection in URL
    /javascript:/i,  // JavaScript protocol
    /vbscript:/i,   // VBScript protocol
    /on\w+=/i,      // Event handlers
    /union.*select/i, // SQL injection patterns
    /\$\{/,         // Template injection
  ]
  
  const fullUrl = request.url + (request.headers.get('user-agent') || '')
  
  if (suspiciousPatterns.some(pattern => pattern.test(fullUrl))) {
    console.warn(`Blocked suspicious request from ${request.headers.get('x-forwarded-for') || 'unknown'}: ${url.pathname}`)
    return NextResponse.json(
      { error: "Request blocked for security reasons" },
      { status: 400 }
    )
  }
  
  // Block requests with overly long headers (potential DoS)
  for (const [name, value] of request.headers.entries()) {
    if (value && value.length > 8192) {
      console.warn(`Blocked request with oversized header ${name}`)
      return NextResponse.json(
        { error: "Request headers too large" },
        { status: 431 }
      )
    }
  }
  
  return null
}

// Initialize security logging
export function logSecurityEvent(event: string, details: Record<string, any>, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event,
    ...details
  }
  
  // Don't log sensitive data
  const sanitizedEntry = { ...logEntry }
  delete sanitizedEntry.password
  delete sanitizedEntry.token
  delete sanitizedEntry.secret
  
  if (level === 'error') {
    console.error('SECURITY:', JSON.stringify(sanitizedEntry))
  } else if (level === 'warn') {
    console.warn('SECURITY:', JSON.stringify(sanitizedEntry))
  } else {
    console.log('SECURITY:', JSON.stringify(sanitizedEntry))
  }
}