"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"
import { Check, X, Clock } from "lucide-react"

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

interface ApplicationsListProps {
  applicationType: string
}

export function ApplicationsList({ applicationType }: ApplicationsListProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchApplications()
  }, [applicationType])

  async function fetchApplications() {
    try {
      const response = await fetch(`/api/applications?type=${applicationType}`)
      const data = await response.json()
      setApplications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch applications:", error)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  async function updateApplicationStatus(id: string, status: "approved" | "rejected", rejectionReason?: string) {
    try {
      const body: any = { status }
      if (rejectionReason && status === "rejected") {
        body.rejectionReason = rejectionReason
      }
      
      // Tilføj admin info til logging
      if (user) {
        body.adminInfo = {
          discordId: user.id,
          discordName: user.username,
          discordAvatar: user.avatar
        }
      }

      await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      setApplications((apps) => apps.map((app) => (app.id === id ? { ...app, status, rejectionReason } : app)))
    } catch (error) {
      console.error("Failed to update application:", error)
    }
  }

  const pendingApps = applications.filter((app) => app.status === "pending")
  const approvedApps = applications.filter((app) => app.status === "approved")
  const rejectedApps = applications.filter((app) => app.status === "rejected")

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Indlæser...</div>
  }

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="pending">Afventende ({pendingApps.length})</TabsTrigger>
        <TabsTrigger value="approved">Godkendt ({approvedApps.length})</TabsTrigger>
        <TabsTrigger value="rejected">Afvist ({rejectedApps.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-6">
        {pendingApps.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Ingen afventende ansøgninger</p>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {pendingApps.map((app) => (
              <AccordionItem key={app.id} value={app.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{app.discordName}</span>
                    <span className="text-xs text-muted-foreground">({app.id})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ApplicationCard
                    application={app}
                    onApprove={() => updateApplicationStatus(app.id, "approved")}
                    onReject={(reason) => updateApplicationStatus(app.id, "rejected", reason)}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </TabsContent>

      <TabsContent value="approved" className="mt-6">
        {approvedApps.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Ingen godkendte ansøgninger</p>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {approvedApps.map((app) => (
              <AccordionItem key={app.id} value={app.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{app.discordName}</span>
                    <span className="text-xs text-muted-foreground">({app.id})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ApplicationCard application={app} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </TabsContent>

      <TabsContent value="rejected" className="mt-6">
        {rejectedApps.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Ingen afviste ansøgninger</p>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {rejectedApps.map((app) => (
              <AccordionItem key={app.id} value={app.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{app.discordName}</span>
                    <span className="text-xs text-muted-foreground">({app.id})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ApplicationCard application={app} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </TabsContent>
    </Tabs>
  )
}

function ApplicationCard({
  application,
  onApprove,
  onReject,
}: {
  application: Application
  onApprove?: () => void
  onReject?: (reason: string) => void
}) {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const handleReject = () => {
    if (onReject) {
      onReject(rejectionReason)
      setIsRejectDialogOpen(false)
      setRejectionReason("")
    }
  }
  const statusConfig = {
    pending: { icon: Clock, color: "bg-yellow-500", label: "Afventende" },
    approved: { icon: Check, color: "bg-green-500", label: "Godkendt" },
    rejected: { icon: X, color: "bg-red-500", label: "Afvist" },
  }

  const config = statusConfig[application.status]
  const StatusIcon = config.icon

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage
                src={`https://cdn.discordapp.com/avatars/${application.discordId}/${application.discordAvatar}.png`}
                alt={application.discordName}
              />
              <AvatarFallback>{application.discordName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{application.discordName}</CardTitle>
              <CardDescription>Discord ID: {application.discordId}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(application.fields).map(([key, value]) => (
          <div key={key}>
            <h4 className="font-semibold mb-1 capitalize">{key.replace(/_/g, " ")}</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
          </div>
        ))}

        <div className="text-xs text-muted-foreground">
          Indsendt:{" "}
          {new Date(application.createdAt).toLocaleDateString("da-DK", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        {application.status === "pending" && onApprove && onReject && (
          <div className="flex gap-2 pt-2">
            <Button onClick={onApprove} className="flex-1" variant="default">
              <Check className="mr-2 h-4 w-4" />
              Godkend
            </Button>
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1" variant="destructive">
                  <X className="mr-2 h-4 w-4" />
                  Afvis
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Afvis Ansøgning</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rejection-reason">Grund til afvisning</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="Indtast grund til afvisning..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsRejectDialogOpen(false)} variant="outline" className="flex-1">
                      Annuller
                    </Button>
                    <Button onClick={handleReject} variant="destructive" className="flex-1">
                      Afvis Ansøgning
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {application.status === "rejected" && application.rejectionReason && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">Afvisningsgrund:</h4>
            <p className="text-sm text-red-700 dark:text-red-300">{application.rejectionReason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
