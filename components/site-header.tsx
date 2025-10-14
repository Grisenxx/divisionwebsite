"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { FileText, LogIn, LogOut, User, Shield, BookOpen } from "lucide-react"

interface SiteHeaderProps {
  showApplyButton?: boolean
  className?: string
}

export function SiteHeader({ showApplyButton = true, className = "" }: SiteHeaderProps) {
  const { user, signIn, signOut, hasRole } = useAuth()

  return (
    <header className={`header-nav sticky top-0 z-50 ${className}`} style={{zIndex: 100}}>
      <div className="container flex items-center justify-between py-6 px-6">
        <Link href="/" className="flex items-center space-x-4 transition-all duration-300 hover:scale-105 hover:brightness-110">
          <Image 
            src="/d.png" 
            alt="Division Logo" 
            width={48}
            height={48}
            className="rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25"
          />
          <span className="text-3xl font-semibold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent transition-all duration-300">Division</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/regler">
            <Button 
              variant="ghost" 
              size="lg" 
              className="text-lg px-6 py-3 font-medium transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-600/10 hover:text-blue-400 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 rounded-xl border border-transparent hover:border-blue-500/20"
            >
              <BookOpen className="mr-3 h-5 w-5 transition-all duration-300" />
              Regler
            </Button>
          </Link>
          
          {showApplyButton && (
            <Link href="/apply">
              <Button 
                variant="ghost" 
                size="lg" 
                className="text-lg px-6 py-3 font-medium transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-600/10 hover:text-blue-400 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 rounded-xl border border-transparent hover:border-blue-500/20"
              >
                <FileText className="mr-3 h-5 w-5 transition-all duration-300" />
                Ansøgninger
              </Button>
            </Link>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/25">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined}
                      alt={user.username}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 backdrop-blur-sm bg-background/95 border border-blue-500/20">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">{user.username}</p>
                    <p className="text-xs leading-none text-gray-400">
                      Discord bruger
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-blue-500/20" />


                {hasRole("1422323250339250206") && (
                  <DropdownMenuItem asChild className="cursor-pointer text-white hover:bg-blue-500/10 hover:text-blue-400 transition-colors focus:text-white">
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span className="text-white">Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-white hover:bg-red-500/10 hover:text-red-400 transition-colors focus:text-white">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="text-white">Log ud</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={signIn}
              size="lg" 
              className="text-lg px-6 py-3 font-medium button-primary transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 rounded-xl"
            >
              <LogIn className="mr-3 h-5 w-5" />
              Log ind
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}