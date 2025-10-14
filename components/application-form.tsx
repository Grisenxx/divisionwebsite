"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { ApplicationType } from "@/config/application-types"

interface ApplicationFormProps {
  applicationType: ApplicationType
  user: {
    id: string
    username: string
    discriminator: string
    avatar: string
  }
}

export function ApplicationForm({ applicationType, user }: ApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canApply, setCanApply] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)

  useEffect(() => {
    checkApplicationStatus()
  }, [applicationType.id])

  async function checkApplicationStatus() {
    try {
      const response = await fetch(`/api/applications/check?type=${applicationType.id}&userId=${user.id}`)
      const data = await response.json()

      if (!data.canApply) {
        setCanApply(false)
        setTimeRemaining(data.timeRemaining)
      }
    } catch (error) {
      console.error("Failed to check application status:", error)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const formFields: Record<string, string> = {}

    applicationType.fields.forEach((field) => {
      formFields[field.id] = formData.get(field.id) as string
    })

    const data = {
      type: applicationType.id,
      discordId: user.id,
      discordName: `${user.username}#${user.discriminator}`,
      discordAvatar: user.avatar,
      fields: formFields,
    }

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setSubmitted(true)
      } else {
        setError(result.error || "Der skete en fejl. Prøv igen senere.")
      }
    } catch (error) {
      console.error("Failed to submit application:", error)
      setError("Der skete en fejl. Prøv igen senere.")
    } finally {
      setLoading(false)
    }
  }

  if (!canApply) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Du har allerede ansøgt om {applicationType.name.toLowerCase()} inden for de sidste 24 timer.
          {timeRemaining && ` Du kan ansøge igen om ${timeRemaining}.`}
        </AlertDescription>
      </Alert>
    )
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <h3 className="text-2xl font-bold text-green-600 mb-2">Ansøgning Sendt!</h3>
        <p className="text-muted-foreground">
          Tak for din ansøgning, {user.username}. Vi vender tilbage til dig hurtigst muligt på Discord.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground mb-1">Discord Konto</p>
        <p className="font-medium">
          {user.username}#{user.discriminator}
        </p>
      </div>

      {applicationType.fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label} {field.required && "*"}
          </Label>

          {field.type === "text" && (
            <Input id={field.id} name={field.id} placeholder={field.placeholder} required={field.required} />
          )}

          {field.type === "number" && (
            <Input
              id={field.id}
              name={field.id}
              type="number"
              min={field.min}
              placeholder={field.placeholder}
              required={field.required}
            />
          )}

          {field.type === "textarea" && (
            <Textarea
              id={field.id}
              name={field.id}
              placeholder={field.placeholder}
              rows={field.rows || 4}
              required={field.required}
            />
          )}

          {field.type === "select" && field.options && (
            <Select name={field.id} required={field.required}>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Vælg..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option.toLowerCase()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sender..." : "Send Ansøgning"}
      </Button>
    </form>
  )
}
