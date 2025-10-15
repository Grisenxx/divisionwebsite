"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApplicationsList } from "@/components/applications-list"
import { ApplicationSearch } from "@/components/application-search"
import { Shield, LogOut, Search } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { applicationTypes } from "@/config/application-types"
import { SiteHeader } from "@/components/site-header"
import Squares from "@/components/Squares"

export default function AdminPage() {
  const { user, loading, signIn, signOut, hasRole } = useAuth()
  const router = useRouter()
  const [selectedType, setSelectedType] = useState(applicationTypes[0]?.id)
  const [activeTab, setActiveTab] = useState("applications")

  useEffect(() => {
    console.log("[DEBUG] Admin page - user:", user, "loading:", loading)
    if (user) {
      console.log("[DEBUG] User roles:", user.roles)
      
      // Special handling for whitelist and beta tester applications - allow multiple roles
      const hasWhitelistAccess = (type: any) => {
        if (type.id === "whitelist") {
          return hasRole("1422323250339250206") || // whitelisted
                 hasRole("1427634524673544232") || // whitelist modtager  
                 hasRole("1427628590580895825")    // staff
        }
        if (type.id === "Betatester") {
          return hasRole("1422323250339250206") || // admin
                 hasRole("1427973710249328692")    // beta test admin
        }
        return type.requiredRole ? hasRole(type.requiredRole) : true
      }
      
      console.log("[DEBUG] Application types access:", applicationTypes.map(type => ({
        id: type.id,
        name: type.name,
        requiredRole: type.requiredRole,
        hasAccess: hasWhitelistAccess(type)
      })))
    }
  }, [user, loading, hasRole])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative">
        <Squares 
          speed={0.05}
          squareSize={50}
          direction="diagonal"
          borderColor="rgba(59, 130, 246, 0.3)"
          hoverFillColor="rgba(59, 130, 246, 0.1)"
        />
        <p className="text-muted-foreground relative z-10">Indlæser...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative">
        <Squares 
          speed={0.05}
          squareSize={50}
          direction="diagonal"
          borderColor="rgba(59, 130, 246, 0.3)"
          hoverFillColor="rgba(59, 130, 246, 0.1)"
        />
        <Card className="w-full max-w-md relative z-10">
          <CardHeader>
            <CardTitle>Login Påkrævet</CardTitle>
            <CardDescription>Du skal logge ind med Discord for at få adgang til admin panelet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={signIn} className="w-full">
              Log ind med Discord
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentType = applicationTypes.find((t) => t.id === selectedType)
  
      // Special handling for whitelist and beta tester applications - allow multiple roles
      const hasWhitelistAccess = (type: any) => {
        if (type.id === "whitelist") {
          return hasRole("1422323250339250206") || // whitelisted
                 hasRole("1427634524673544232") || // whitelist modtager  
                 hasRole("1427628590580895825")    // staff
        }
        if (type.id === "Betatester") {
          return hasRole("1422323250339250206") || // admin
                 hasRole("1427973710249328692")    // beta test admin
        }
        return type.requiredRole ? hasRole(type.requiredRole) : true
      }
      
  const hasAccess = currentType ? hasWhitelistAccess(currentType) : true

  // Tjek om brugeren har adgang til mindst én ansøgningstype
  const hasAnyAccess = applicationTypes.some((type) => hasWhitelistAccess(type))

  if (!hasAnyAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative">
        <Squares 
          speed={0.05}
          squareSize={50}
          direction="diagonal"
          borderColor="rgba(59, 130, 246, 0.3)"
          hoverFillColor="rgba(59, 130, 246, 0.1)"
        />
        <Card className="w-full max-w-md relative z-10">
          <CardHeader>
            <CardTitle>Adgang Nægtet</CardTitle>
            <CardDescription>Du har ikke de nødvendige rettigheder til at se denne side</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Squares 
        speed={0.05}
        squareSize={50}
        direction="diagonal"
        borderColor="rgba(59, 130, 246, 0.3)"
        hoverFillColor="rgba(59, 130, 246, 0.1)"
      />
      <SiteHeader showApplyButton={false} className="relative z-10" />

      <div className="container mx-auto px-4 pt-32 pb-20 relative z-10">
        <div className="mb-16 mt-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 max-w-md mx-auto">
              <TabsTrigger value="applications">Ansøgninger</TabsTrigger>
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Søg Ansøgninger
              </TabsTrigger>
            </TabsList>

          <TabsContent value="applications">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12 mb-12 max-w-4xl mx-auto">
              {applicationTypes.map((type) => {
                const canView = !type.requiredRole || hasRole(type.requiredRole)
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition hover:shadow-lg ${selectedType === type.id ? "border-primary" : ""}`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
            {currentType && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{currentType.name}</CardTitle>
                  <CardDescription>Gennemse og administrer indkomne ansøgninger</CardDescription>
                </CardHeader>
                <CardContent>
                  {hasAccess ? (
                    <ApplicationsList applicationType={currentType.id} />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Du har ikke adgang til at se disse ansøgninger
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

            <TabsContent value="search">
              <ApplicationSearch />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
