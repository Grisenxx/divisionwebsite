"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import Squares from "@/components/Squares"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ApplicationForm } from "@/components/application-form"
import { useAuth } from "@/components/auth-provider"
import { applicationTypes } from "@/config/application-types"
import { SiteHeader } from "@/components/site-header"
import { LogIn, ArrowLeft } from "lucide-react"
import { motion } from "motion/react"

function ApplyPageContent() {
  const { user, loading, signIn, signOut, hasRole } = useAuth()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')
  
  // Vis kun whitelist hvis brugeren ikke har whitelist-rollen, ellers vis alt uden whitelist
  const filteredTypes = user && user.roles?.includes("1422323250339250206")
    ? applicationTypes.filter((type) => type.id !== "whitelist")
    : applicationTypes.filter((type) => type.id === "whitelist")
  
  const [selectedType, setSelectedType] = useState("")

  // Update selected type based on URL parameter
  useEffect(() => {
    if (typeParam && filteredTypes.some(type => type.id === typeParam)) {
      setSelectedType(typeParam)
    }
  }, [typeParam, filteredTypes])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Indlæser...</p>
      </div>
    )
  }

  if (!user) {
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

        <div className="container pt-32 pb-20 max-w-2xl relative z-10 flex items-center min-h-screen">
          <Card className="card-hover">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-4xl mb-4 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Login Påkrævet
              </CardTitle>
              <CardDescription className="text-lg leading-relaxed">
                Du skal logge ind med Discord for at kunne ansøge. Dette sikrer at vi kan kontakte dig og verificere din
                identitet.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button onClick={signIn} size="lg" className="button-primary w-full gap-3 py-4 text-lg">
                <LogIn className="h-6 w-6" />
                Log ind med Discord
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentType = filteredTypes.find((t) => t.id === selectedType) || filteredTypes[0]

  if (!filteredTypes.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ingen ansøgninger tilgængelige</CardTitle>
            <CardDescription>
              Du har allerede den nødvendige rolle, eller der er ingen ansøgningstyper tilgængelige for dig.
            </CardDescription>
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

      <div className="container pt-24 pb-20 max-w-4xl relative z-10">
        {!selectedType ? (
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-12 mt-8"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent px-4">
                Vælg Ansøgningstype
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto px-4 pb-4">
                Vælg den type ansøgning der passer til dig
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto px-4">
              {filteredTypes.map((type, index) => (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + (index * 0.2) }}
                  className="w-full"
                >
                  <Card
                    className="card-hover cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 border border-blue-500/20 hover:border-blue-400/40 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm h-auto"
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardHeader className="text-center p-6 flex flex-col justify-center items-center space-y-4">
                      <CardTitle className="text-xl text-foreground hover:text-blue-400 transition-colors duration-300 text-center leading-tight">
                        {type.name}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-base leading-relaxed text-center">
                        {type.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Button 
                variant="ghost" 
                onClick={() => setSelectedType("")}
                className="mb-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all duration-300"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbage til ansøgningstyper
              </Button>
              
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                {currentType?.name}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {currentType?.description}
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="card-hover bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-blue-500/20 shadow-xl shadow-blue-500/10">
                <CardContent className="p-8">
                  <ApplicationForm applicationType={currentType} user={user} />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Indlæser...</p>
      </div>
    }>
      <ApplyPageContent />
    </Suspense>
  )
}
