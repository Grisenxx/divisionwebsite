"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, User, Calendar, FileText } from "lucide-react"

interface Application {
  id: string
  type: string
  discordId: string
  discordName: string
  discordAvatar: string
  fields: Record<string, string>
  status: "pending" | "approved" | "rejected"
  createdAt: string
  rejectionReason?: string
}

export function ApplicationSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch() {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setHasSearched(true)
    
    try {
      const response = await fetch(`/api/applications/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await response.json()
      
      if (response.ok) {
        setSearchResults(Array.isArray(data) ? data : [])
      } else {
        console.error("Search error:", data.error)
        setSearchResults([])
      }
    } catch (error) {
      console.error("Search failed:", error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: "Afventende", variant: "secondary" as const },
      approved: { label: "Godkendt", variant: "default" as const },
      rejected: { label: "Afvist", variant: "destructive" as const }
    }
    return config[status as keyof typeof config] || config.pending
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Søg Ansøgninger
          </CardTitle>
          <CardDescription>
            Søg efter tidligere ansøgninger med Discord ID eller Discord navn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Indtast Discord ID eller Discord navn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Søger..." : "Søg"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Søgeresultater ({searchResults.length})
            </h3>
            {searchResults.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Søgte efter: "{searchQuery}"
              </p>
            )}
          </div>

          {searchResults.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Ingen ansøgninger fundet for "{searchQuery}"
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((app) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={`https://cdn.discordapp.com/avatars/${app.discordId}/${app.discordAvatar}.png`}
                            alt={app.discordName}
                          />
                          <AvatarFallback>
                            {app.discordName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{app.discordName}</CardTitle>
                          <CardDescription>ID: {app.discordId}</CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge {...getStatusBadge(app.status)}>
                          {getStatusBadge(app.status).label}
                        </Badge>
                        <Badge variant="outline">{app.type}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Indsendt: {new Date(app.createdAt).toLocaleDateString("da-DK", {
                          year: "numeric",
                          month: "long", 
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        Ansøgnings ID: {app.id}
                      </div>

                      {app.status === "rejected" && app.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                          <h5 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                            Afvisningsgrund:
                          </h5>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {app.rejectionReason}
                          </p>
                        </div>
                      )}

                      {/* Vis ansøgningsfelter */}
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium hover:text-primary">
                          Vis ansøgningsdetaljer
                        </summary>
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-muted">
                          {Object.entries(app.fields).map(([key, value]) => (
                            <div key={key}>
                              <h6 className="font-medium text-sm capitalize">
                                {key.replace(/_/g, " ")}:
                              </h6>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}