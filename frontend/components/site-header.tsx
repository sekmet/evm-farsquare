import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeSelector } from "@/components/theme-selector"
import { useAuth } from "@/contexts/AuthContext"
import { useAccount, useBalance } from "wagmi"
import {
  IconBell,
  IconWallet,
  IconPlus,
  IconShieldCheck,
  IconUser,
  IconSettings,
  IconCreditCard,
  IconCirclePlusFilled,
} from "@tabler/icons-react"

export function SiteHeader() {
  const { user } = useAuth()
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({
    address,
  })

  return (
    <header className="@container/main flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Dashboard</h1>

        {/* Quick Actions */}
        <div className="ml-auto flex items-center gap-2" data-testid="quick-actions">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <IconCirclePlusFilled className="h-4 w-4 fill-amber-400" />
            Tokenize Asset
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <IconShieldCheck className="h-4 w-4 fill-sky-600" />
            View Compliance
          </Button>
        </div>

        {/* Wallet Balance */}
        {isConnected && balance && (
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md" data-testid="wallet-balance">
            <IconWallet className="h-4 w-4 fill-lime-500" />
            <span className="text-sm font-medium">
              {Number(balance.formatted).toFixed(3)} {balance.symbol}
            </span>
          </div>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative" data-testid="notification-bell">
          <IconBell className="h-4 w-4" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            3
          </Badge>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild data-testid="user-profile-dropdown">
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                <AvatarFallback>
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <IconUser className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconWallet className="mr-2 h-4 w-4" />
              Wallet
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconCreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconBell className="mr-2 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconSettings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <IconShieldCheck className="mr-2 h-4 w-4" />
              Compliance
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ModeToggle />
        <ThemeSelector />
      </div>
    </header>
  )
}
