"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import Squares from "@/components/Squares"
import { BookOpen, Users, Shield, AlertTriangle, CheckCircle } from "lucide-react"
import { motion } from "motion/react"

export default function ReglerPage() {
  const rules = [
    {
      id: 1,
      category: "1. Generelle Regler",
      icon: Shield,
      color: "blue",
      rules: [
        "1.0 Mobning - Division accepterer på ingen måde nogen former for mobning. Mobning i RP tolereres heller ikke.",
        "1.1 Tredjepartsprogrammer - Alle former for tredjepartsprogrammer er ikke tilladt og vil straffes med permanent udelukkelse.",
        "1.2 Bugs & Glitches - Alle former for bugs og glitches skal rapporteres til devs. Udnyttelse resulterer i permanent udelukkelse.",
        "1.3 Ajourføring - Det er dit ansvar som spiller at holde dig opdateret på reglerne."
      ]
    },
    {
      id: 2,
      category: "2. RP Regler",
      icon: Users,
      color: "green", 
      rules: [
        "2.0 RDM - Random Death Match er ikke tilladt. Du skal have gyldigt grundlag for at angribe eller dræbe.",
        "2.1 VDM - Vehicle Deathmatch er forbudt. Brug ikke dit køretøj som våben.",
        "2.2 Meta-Gaming - Ingen brug af information fra streams, Discord eller andre eksterne kilder mens du spiller.",
        "2.3 NLR - New Life Rule: Når du dør, glemmer du alt og vender ikke tilbage til området.",
        "2.4 FearRP - Du skal frygte for dit liv og ikke agere som om du har flere liv.",
        "2.5 OOC - Out of Character kommunikation er totalt forbudt ingame.",
        "2.6 Powergaming - Tilladt til en vis grad, men vær realistisk.",
        "2.7 Røveri - Strengt forbudt uden gyldigt grundlag. Ingen røveri for egen indkomst."
      ]
    },
    {
      id: 3,
      category: "3. Firma Regler",
      icon: BookOpen,
      color: "purple",
      rules: [
        "3.1 Misbrug/Udnyttelse af firmaet resulterer i lukning",
        "3.2 Salg af virksomhed skal drøftes gennem staff-teamet",
        "3.3 Grov kriminalitet kan koste ejerskabet af virksomheden",
        "3.4 Ban fra server kan resultere i tab af firma ejerskab",
        "3.5 Aktivitet og godt humør forventes fra firma ansvarlige",
        "3.6 Medarbejderlist skal holdes opdateret",
        "3.7 Realistisk lønningssystem der ikke skader serverens økonomi"
      ]
    },
    {
      id: 4,
      category: "4. Bande Regler",
      icon: Users,
      color: "red",
      rules: [
        "4.1 Maksimalt 18 medlemmer i en bande + ubegrænset pushere",
        "4.2 Ban som bandeleder kan resultere i tab af ejerskab",
        "4.3 Pushere må inddrages i bande RP med god begrundelse",
        "4.4 Alliancer er tilladt mellem bander",
        "4.5 Bande exit kan resultere i CK hvis beskrevet i Code of Conduct",
        "4.6 Dumbøder skal være realistiske beløb - tænk realistisk",
        "4.7 Rush af bandegrund tilladt med mulighed for CK ved ulige antal",
        "4.8 Køb af bandegrund sker gennem RP",
        "4.9 Våbenkonflikter er ikke automatisk krig"
      ]
    },
    {
      id: 5,
      category: "5. Bandekrigs Regler", 
      icon: AlertTriangle,
      color: "orange",
      rules: [
        "5.1 Krigsregler aftales ingame mellem banderne gennem møder",
        "5.2 Efter 3 dages konflikt kan krig erklæres gennem support"
      ]
    }
  ]

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        hover: "hover:border-blue-500/40 hover:shadow-blue-500/20",
        icon: "text-blue-400",
        gradient: "from-blue-500/10 to-blue-600/10"
      },
      green: {
        hover: "hover:border-green-500/40 hover:shadow-green-500/20", 
        icon: "text-green-400",
        gradient: "from-green-500/10 to-green-600/10"
      },
      purple: {
        hover: "hover:border-purple-500/40 hover:shadow-purple-500/20",
        icon: "text-purple-400", 
        gradient: "from-purple-500/10 to-purple-600/10"
      },
      red: {
        hover: "hover:border-red-500/40 hover:shadow-red-500/20",
        icon: "text-red-400",
        gradient: "from-red-500/10 to-red-600/10"
      },
      orange: {
        hover: "hover:border-orange-500/40 hover:shadow-orange-500/20",
        icon: "text-orange-400",
        gradient: "from-orange-500/10 to-orange-600/10"
      }
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
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
      <SiteHeader showApplyButton={true} className="relative z-10" />

      <div className="container pt-32 pb-20 max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Division Regler
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Division tror på, at serverens spillerbase med klare regler og retningslinjer kan tiltrække en større spillerbase, 
            og at det vil resultere i en mere interessant, spændende og fed spiloplevelse for alle.
          </p>
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg max-w-2xl mx-auto">
            <p className="text-red-400 font-semibold text-lg mb-2">⚠️ Aldersgrænse på Division</p>
            <p className="text-sm text-muted-foreground">
              Whitelist på Division tildeles kun spillere over 18 år. Du kan til enhver tid blive bedt om at bevise din alder 
              med billede ID/legitimationskort. Fremstilles der ikke tilstrækkeligt bevis, frafalder dit whitelist.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {rules.map((section, index) => {
            const IconComponent = section.icon
            const colors = getColorClasses(section.color)
            
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + (index * 0.1) }}
              >
                <Card className={`card-hover transition-all duration-300 hover:scale-102 hover:shadow-xl ${colors.hover} border border-blue-500/20 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm h-full`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${colors.gradient}`}>
                        <IconComponent className={`h-6 w-6 ${colors.icon}`} />
                      </div>
                      <CardTitle className="text-xl text-foreground">
                        {section.category}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {section.rules.map((rule, ruleIndex) => (
                        <motion.li 
                          key={ruleIndex}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.6 + (index * 0.1) + (ruleIndex * 0.05) }}
                          className="flex items-start gap-3 text-muted-foreground"
                        >
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="leading-relaxed">{rule}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <Card className="card-hover border border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="text-xl text-center text-foreground flex items-center justify-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  Strike System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <span className="text-yellow-400 font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-yellow-400">1 Strike = Første advarsel</p>
                      <p className="text-sm text-muted-foreground">Tænk 1 advarsel tilbage</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <span className="text-orange-400 font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-orange-400">2 Strike = Anden advarsel</p>
                      <p className="text-sm text-muted-foreground">Ikke flere advarsler tilbage</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <span className="text-red-400 font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-red-400">3 Strike = Bande Lukning</p>
                      <p className="text-sm text-muted-foreground">3 dage til at sælge ud af zoner</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2 border-t border-red-500/20">
                  Bande strikes udløber efter 3 måneder
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            <Card className="card-hover border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="text-xl text-center text-foreground flex items-center justify-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                  Vigtig Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Ved at blive medlem af Division accepterer du at følge alle ovenstående regler.
                </p>
                <p className="text-muted-foreground">
                  Det er dit ansvar som spiller at holde dig opdateret på reglerne. Der er ingen undskyldninger.
                </p>
                <p className="text-muted-foreground">
                  Hvis du har spørgsmål til reglerne, er du velkommen til at kontakte staff via ticket systemet.
                </p>
                <p className="text-sm text-yellow-400 font-medium">
                  Dyk ned i vores reglement på Division og opret endelig en ticket hvis du er i tvivl over noget!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}