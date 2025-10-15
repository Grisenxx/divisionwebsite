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
  discordName: z.string()
    .min(1, "Discord navn påkrævet")
    .max(50, "Discord navn for langt")
    .refine(name => !name.toLowerCase().includes('@everyone'), "@everyone ikke tilladt i Discord navn")
    .refine(name => !name.toLowerCase().includes('@here'), "@here ikke tilladt i Discord navn")
    .refine(name => !name.startsWith('@'), "Discord navn må ikke starte med @")
    .refine(name => !/[<>]/.test(name), "Discord navn må ikke indeholde < eller >"),
  discordId: z.string().regex(/^\d{17,19}$/, "Ugyldigt Discord ID format"),
  fields: z.record(z.string().max(2000)) // Max 2000 chars per field
})

// Enhanced input sanitization with Discord mention protection
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/@(everyone|here)/gi, '@\u200B$1') // Prevent @everyone/@here mentions with zero-width space
    .replace(/<@&?\d{17,19}>/g, '[rolle mention fjernet]') // Remove role/user mentions
    .replace(/discord\.gg\/\w+/gi, '[discord invite fjernet]') // Remove Discord invites
    .trim()
}

// Prevent application data tampering during approval process
export function validateApplicationIntegrity(originalApp: any, submittedFields: any): boolean {
  // Ensure core application fields cannot be modified
  const protectedFields = ['id', 'discordId', 'discordName', 'type', 'createdAt']
  
  for (const field of protectedFields) {
    if (submittedFields.hasOwnProperty(field)) {
      console.warn(`Attempt to modify protected field: ${field}`)
      return false
    }
  }

  // Validate that application fields structure matches original
  const originalFieldKeys = Object.keys(originalApp.fields || {}).sort()
  const submittedFieldKeys = Object.keys(submittedFields.fields || {}).sort()
  
  // Allow fields to be missing (approval process) but not added/renamed
  for (const key of submittedFieldKeys) {
    if (!originalFieldKeys.includes(key)) {
      console.warn(`Attempt to add new field during approval: ${key}`)
      return false
    }
  }

  return true
}

// Enhanced MongoDB injection prevention and query security
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query
  }
  
  const sanitized: any = {}
  for (const [key, value] of Object.entries(query)) {
    // Prevent NoSQL injection - strict allowlist approach
    if (key.startsWith('$') || key.includes('.') || key.includes('\0')) {
      console.warn(`Blocked potentially malicious MongoDB key: ${key}`)
      continue
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMongoQuery(value)
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (Array.isArray(value)) {
      // Sanitize array values
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : 
        typeof item === 'object' ? sanitizeMongoQuery(item) : item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

// Generate secure MongoDB ObjectId-like string for application IDs
export function generateSecureId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16)
  const randomBytes = Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  return timestamp + randomBytes
}

// Validate application update permissions based on type and user role
export function validateUpdatePermissions(applicationType: string, userRoles: string[]): boolean {
  const typePermissions: { [key: string]: string[] } = {
    'whitelist': ['1422323250339250206'], // Whitelist role
    'staff': ['1422323250339250206'], // Admin roles
    'wlmodtager': ['1422323250339250206'],
    'cc': ['1422323250339250206'], 
    'bande': ['1422323250339250206'],
    'firma': ['1422323250339250206']
  }

  const requiredRoles = typePermissions[applicationType] || ['1422323250339250206']
  return requiredRoles.some(role => userRoles.includes(role))
}