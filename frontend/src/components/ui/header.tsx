"use client"

import { Button } from "@/components/ui/button"
import { User, Moon, Sun, BookOpen, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import AuthDialog from "@/components/auth/AuthDialog"
import ProfileDropdown from "@/components/auth/ProfileDropdown"
import { useToast } from "@/components/ui/use-toast"

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode")
      return savedMode ? JSON.parse(savedMode) : false
    }
    return false
  })

  // Determine current page
  const currentPath = location.pathname
  const isHomePage = currentPath === "/" || /^\/(groww|dhan|rise|others)/.test(currentPath)
  const isToolsPage = currentPath === "/tools"
  const isJournalPage = currentPath === "/journal" || currentPath.startsWith("/journal/")

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  return (
    <nav className="relative border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-lg backdrop-blur-md">
      <div className="absolute inset-0 bg-white/60 dark:bg-black/20 backdrop-blur-sm" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md" />
          </div>
          <h1
            className="text-xl font-bold cursor-pointer bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent hover:scale-105 transition-all duration-300"
            onClick={() => navigate("/")}
          >
            TradeSmart
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Home button with simple underline */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${
              isHomePage ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            Home
            {isHomePage && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            )}
          </Button>

          {/* Tools button with simple underline */}
          <Button
            variant="ghost"
            onClick={() => navigate("/tools")}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${
              isToolsPage ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            Tools
            {isToolsPage && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            )}
          </Button>

          {/* Journal button with simple underline */}
          <Button
            variant="ghost"
            onClick={() => {
              if (user) {
                navigate("/journal")
              } else {
                setAuthDialogOpen(true)
                toast({
                  title: "Login Required",
                  description: "You need to be logged in to add/view journals.",
                  variant: "default",
                })
              }
            }}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${
              isJournalPage ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Journal
            {isJournalPage && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            )}
          </Button>

          {user ? (
            <div className="ml-2">
              <ProfileDropdown />
            </div>
          ) : (
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-3 py-2 ml-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 shadow-sm"
              onClick={() => setAuthDialogOpen(true)}
            >
              <User className="h-4 w-4" />
              Login
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="ml-2 rounded-full p-2 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-500 transition-all duration-300 hover:shadow-md hover:scale-110 shadow-sm"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </Button>
        </div>
      </div>

      <AuthDialog isOpen={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
    </nav>
  )
}

export default Header
