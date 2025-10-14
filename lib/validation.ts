import { z } from "zod"

// Validation schemas
export const applicationUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
  rejectionReason: z.string().max(1000).optional(),
  adminInfo: z.object({
    discordId: z.string().regex(/^\d{17,19}$/), // Discord ID format
    discordName: z.string().max(100),
    discordAvatar: z.string().optional()
  })
})

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100).regex(/^[a-zA-Z0-9#_\s]+$/) // Alphanumeric + common Discord chars
})

export const applicationSubmissionSchema = z.object({
  type: z.enum(["whitelist", "staff", "wlmodtager", "cc", "bande", "firma"]),
  fields: z.record(z.string().max(2000)) // Max 2000 chars per field
})

// Sanitize input function
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

// MongoDB injection prevention
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query
  }
  
  const sanitized: any = {}
  for (const [key, value] of Object.entries(query)) {
    // Prevent NoSQL injection
    if (key.startsWith('$') || key.includes('.')) {
      continue // Skip potentially dangerous operators
    }
    sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value
  }
  
  return sanitized
}