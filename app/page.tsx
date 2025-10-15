"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Shield } from "lucide-react"
import { ServerStatus } from "@/components/server-status"
import BlurText from "@/components/BlurText"
import Squares from "@/components/Squares"
import { SiteHeader } from "@/components/site-header"
import { motion } from "motion/react"

export default function HomePage() {
  const handleAnimationComplete = () => {
    console.log('Velkommen animation completed!');
  };
  return (
    <div className="min-h-screen bg-background relative">
      <Squares 
        speed={0.05}
        squareSize={50}
        direction="diagonal"
        borderColor="rgba(59, 130, 246, 0.3)"
        hoverFillColor="rgba(59, 130, 246, 0.1)"
      />
      
      <SiteHeader />

      {/* Hero Section */}
      <section className="hero-section relative flex flex-col items-center justify-center min-h-screen text-center px-4" style={{zIndex: 100}}>
        <div className="container max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal mb-6 leading-tight font-sans tracking-wide">
              <span className="text-foreground">Velkommen til </span>
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent font-semibold">Division</span>
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mb-12"
          >
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed font-normal">
              Bliv en del af Danmarks mest professionelle FiveM community
            </p>
          </motion.div>

          {/* Server Status */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="server-status-container mb-12"
          >
            <ServerStatus />
          </motion.div>

          {/* Discord Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="mt-8"
          >
            <Button size="lg" className="button-primary px-8 py-4 text-lg font-semibold transform hover:scale-105 transition-transform">
              <a href="https://discord.gg/divisiondk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.077.077 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Join Discord Server
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gradient-to-b from-transparent to-card/20 relative z-10">
        <div className="container">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Hvorfor vælge Division?</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Vi tilbyder den bedste gaming oplevelse med professionelt staff og aktive spillere
            </p>
          </div>
          <div className="features-grid">
            <Card className="card-hover">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl mb-3">Aktiv Community</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Bliv en del af vores voksende community med dedikerede spillere der deler din passion for gaming
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl mb-3">Professionelt Staff</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Erfarne moderatorer og administratorer der sikrer en fair og sjov oplevelse for alle spillere
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
