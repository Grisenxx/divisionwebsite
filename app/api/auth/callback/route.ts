import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const redirect = searchParams.get("state") // Discord sender state tilbage

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token")
    }

    // Get user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    // Get user's roles in your Discord server
    const guildId = process.env.DISCORD_GUILD_ID!
    const memberResponse = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const memberData = await memberResponse.json()

    // Create session
    const session = {
      user: {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        roles: memberData.roles || [],
      },
      accessToken: tokenData.access_token,
    }

    // Store session in cookie
    const cookieStore = await cookies()
    cookieStore.set("session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Redirect to the intended page if specified, otherwise to /apply
    const redirectTo = redirect || "/apply"
    return NextResponse.redirect(new URL(redirectTo, request.url))
  } catch (error) {
    console.error("Discord OAuth error:", error)
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url))
  }
}
