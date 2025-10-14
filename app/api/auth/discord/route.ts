import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Discord OAuth2 configuration
  // You need to set these environment variables:
  // DISCORD_CLIENT_ID - Your Discord application client ID
  // DISCORD_REDIRECT_URI - Your redirect URI (e.g., http://localhost:3000/api/auth/callback)

  const clientId = process.env.DISCORD_CLIENT_ID
  const redirectUri = process.env.DISCORD_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Discord OAuth not configured. Please set DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI" },
      { status: 500 },
    )
  }

  // Get redirect parameter from query string
  const searchParams = request.nextUrl.searchParams
  const redirectTo = searchParams.get("redirect") || "/apply" // Default to /apply if no redirect specified
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify%20guilds.members.read&state=${encodeURIComponent(redirectTo)}`

  return NextResponse.redirect(discordAuthUrl)
}
