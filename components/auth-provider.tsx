"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

interface User {
  id: string
  username: string
  discriminator: string
  avatar: string
  roles: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: () => void
  signOut: () => void
  hasRole: (roleId: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error("Failed to check auth:", error)
    } finally {
      setLoading(false)
    }
  }

  function signIn() {
    // Redirect to Discord OAuth with current path as redirect parameter
    const currentPath = window.location.pathname
    window.location.href = `/api/auth/discord?redirect=${encodeURIComponent(currentPath)}`
  }

  async function signOut() {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
      setUser(null)
    } catch (error) {
      console.error("Failed to sign out:", error)
    }
  }

  function hasRole(roleId: string): boolean {
    return user?.roles?.includes(roleId) ?? false
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, hasRole }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
