"use client"

import * as React from "react"
import { IconBrightness } from "@tabler/icons-react"
import { useTheme } from "@/contexts/active-theme"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { setActiveTheme, activeTheme } = useTheme()

  const toggleTheme = React.useCallback(() => {
    setActiveTheme(activeTheme === "dark" ? "light" : "dark")
  }, [activeTheme, setActiveTheme])

  return (
    <Button
      variant="secondary"
      size="icon"
      className="group/toggle size-8"
      onClick={toggleTheme}
    >
      <IconBrightness />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}