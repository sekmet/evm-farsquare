"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type ActiveTheme = string

type ActiveThemeProviderProps = {
  children: ReactNode
  defaultTheme?: ActiveTheme
  storageKey?: string
}

type ActiveThemeProviderState = {
  activeTheme: ActiveTheme
  setActiveTheme: (theme: ActiveTheme) => void
}

const initialState: ActiveThemeProviderState = {
  activeTheme: "default",
  setActiveTheme: () => null,
}

const ThemeContext = createContext<ActiveThemeProviderState>(initialState)

export function ActiveThemeProvider({
  children,
  defaultTheme = "default",
  storageKey = "vite-ui-theme",
  ...props
}: ActiveThemeProviderProps) {
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(
    () => (localStorage.getItem(storageKey) as ActiveTheme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    // Remove existing theme classes
    Array.from(root.classList)
      .filter((className) => className.startsWith("theme-"))
      .forEach((className) => {
        root.classList.remove(className)
      })

    // Add new theme class
    root.classList.add(`theme-${activeTheme}`)

    // Handle scaled themes
    if (activeTheme.endsWith("-scaled")) {
      root.classList.add("theme-scaled")
    } else {
      root.classList.remove("theme-scaled")
    }
  }, [activeTheme])

  const value = {
    activeTheme,
    setActiveTheme: (theme: ActiveTheme) => {
      localStorage.setItem(storageKey, theme)
      setActiveTheme(theme)
    },
  }

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeConfig() {
  const context = useContext(ThemeContext)

  if (context === undefined)
    throw new Error("useThemeConfig must be used within an ActiveThemeProvider")

  return context
}

export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ActiveThemeProvider")

  return context
}