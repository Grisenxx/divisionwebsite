"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Server, MapPin, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ServerData {
  players: number
  maxPlayers: number
  online: boolean
  serverName: string
  gametype?: string
  mapname?: string
  uptime?: number | null
  lastSeen?: string
  endpoint?: string
  connectEndPoints?: string[]
  error?: string
  discordMembers?: number
  whitelistedMembers?: number
}

export function ServerStatus() {
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchServerStatus()
    const interval = setInterval(fetchServerStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchServerStatus() {
    try {
      const response = await fetch("/api/server-status")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const text = await response.text()
      
      // Check if response is empty
      if (!text.trim()) {
        throw new Error("Empty response from server")
      }
      
      // Try to parse JSON
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error("Invalid JSON response:", text.substring(0, 200))
        throw new Error("Invalid JSON response")
      }
      
      setServerData(data)
    } catch (error) {
      console.error("Failed to fetch server status:", error)
      setServerData({
        players: 0,
        maxPlayers: 64,
        online: false,
        serverName: "Division",
        error: "Kunne ikke hente server status",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl card-hover">
        <CardContent className="flex items-center justify-center gap-4 p-8">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-lg">Indlæser server status...</p>
        </CardContent>
      </Card>
    )
  }

  if (!serverData) return null

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      {/* Error Alert */}
      {serverData.error && (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverData.error}</AlertDescription>
        </Alert>
      )}

      <Card className="w-full card-hover">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Server className="h-6 w-6 text-primary" />
            </div>
            {serverData.serverName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player Count */}
            <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Spillere Online</p>
                <p className="text-3xl font-bold text-foreground">
                  {serverData.players}<span className="text-xl text-muted-foreground">/{serverData.maxPlayers}</span>
                </p>
              </div>
            </div>

            {/* Server Status */}
            <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <div
                  className={`h-6 w-6 rounded-full ${
                    serverData.online 
                      ? "bg-green-400 shadow-lg shadow-green-400/50" 
                      : "bg-red-400 shadow-lg shadow-red-400/50"
                  } ${serverData.online ? "animate-pulse" : ""}`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Server Status</p>
                <p className="text-2xl font-bold text-foreground">
                  {serverData.online ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {serverData.gametype && serverData.mapname && (
            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{serverData.mapname}</span>
                </div>
                <div className="flex items-center justify-center">
                  <span>{serverData.gametype}</span>
                </div>
              </div>
            </div>
          )}

          {/* Discord and Whitelisted Members Info */}
          <div className="text-center p-4 bg-secondary/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                Discord Medlemmer: {serverData.discordMembers !== null ? serverData.discordMembers : "Indlæser..."}
              </div>
              <div>
                Whitelisted Medlemmer: {serverData.whitelistedMembers !== null ? serverData.whitelistedMembers : "Indlæser..."}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
