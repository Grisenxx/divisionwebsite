import crypto from 'crypto'

// Environment variable validation and security
export interface SecureEnvironment {
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  DISCORD_BOT_TOKEN: string
  DISCORD_GUILD_ID: string
  MONGODB_URI: string
  JWT_SECRET: string
  NEXTAUTH_SECRET: string
}

// Validate environment variables on startup
export function validateEnvironment(): SecureEnvironment {
  const requiredVars: (keyof SecureEnvironment)[] = [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET', 
    'DISCORD_BOT_TOKEN',
    'DISCORD_GUILD_ID',
    'MONGODB_URI',
    'JWT_SECRET',
    'NEXTAUTH_SECRET'
  ]

  const env = {} as SecureEnvironment

  for (const varName of requiredVars) {
    const value = process.env[varName]
    
    if (!value) {
      throw new Error(`Missing required environment variable: ${varName}`)
    }

    // Validate specific formats
    switch (varName) {
      case 'DISCORD_CLIENT_ID':
      case 'DISCORD_GUILD_ID':
        if (!/^\d{17,19}$/.test(value)) {
          throw new Error(`Invalid ${varName}: Must be a valid Discord ID (17-19 digits)`)
        }
        break

      case 'DISCORD_BOT_TOKEN':
        if (!/^[A-Za-z0-9._-]+$/.test(value) || value.length < 50) {
          throw new Error(`Invalid ${varName}: Must be a valid Discord bot token`)
        }
        break

      case 'JWT_SECRET':
      case 'NEXTAUTH_SECRET':
        if (value.length < 32) {
          throw new Error(`${varName} must be at least 32 characters long`)
        }
        // Check for inappropriate content
        const inappropriate = ['nigger', 'faggot', 'retard', 'kike', 'spic']
        if (inappropriate.some(word => value.toLowerCase().includes(word))) {
          throw new Error(`${varName} contains inappropriate content and must be changed`)
        }
        break

      case 'MONGODB_URI':
        if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
          throw new Error(`Invalid ${varName}: Must be a valid MongoDB connection string`)
        }
        break
    }

    env[varName] = value
  }

  return env
}

// Generate secure random secrets
export function generateSecureSecret(): string {
  return crypto.randomBytes(64).toString('base64url')
}

// Environment security recommendations
export function getSecurityRecommendations(): string[] {
  const recommendations = []

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXTAUTH_URL?.startsWith('https://')) {
      recommendations.push('NEXTAUTH_URL should use HTTPS in production')
    }
    
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      recommendations.push('JWT_SECRET should be at least 64 characters long in production')
    }
  }

  // Check for development secrets in production
  const devSecrets = ['development', 'dev', 'test', 'localhost']
  if (process.env.NODE_ENV === 'production') {
    for (const [key, value] of Object.entries(process.env)) {
      if (key.includes('SECRET') && value) {
        if (devSecrets.some(dev => value.toLowerCase().includes(dev))) {
          recommendations.push(`${key} appears to contain development values in production`)
        }
      }
    }
  }

  return recommendations
}

// Secure environment logger (without exposing secrets)
export function logEnvironmentStatus(): void {
  try {
    validateEnvironment()
    console.log('✅ Environment validation passed')
    
    const recommendations = getSecurityRecommendations()
    if (recommendations.length > 0) {
      console.warn('⚠️  Security recommendations:')
      recommendations.forEach(rec => console.warn(`  - ${rec}`))
    }
  } catch (error) {
    console.error('❌ Environment validation failed:', (error as Error).message)
    if (process.env.NODE_ENV === 'production') {
      throw error // Fail hard in production
    }
  }
}