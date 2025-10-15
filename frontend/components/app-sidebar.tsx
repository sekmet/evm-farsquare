import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconCoin,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconHome,
  IconInnerShadowTop,
  IconListDetails,
  IconMail,
  IconReport,
  IconSearch,
  IconSettings,
  IconShoppingCart,
  IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Properties",
      url: "/properties",
      icon: IconHome,
    },
    {
      title: "Marketplace",
      url: "/marketplace",
      icon: IconShoppingCart,
    },
    {
      title: "Tokens",
      url: "/tokens",
      icon: IconCoin,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: IconChartBar,
    },
    {
      title: "Compliance",
      url: "/compliance",
      icon: IconListDetails,
    },
  ],
  navClouds: [
    {
      title: "My Properties",
      icon: IconHome,
      url: "/properties/owned",
      items: [
        {
          title: "Property Management",
          url: "/properties/owned",
        },
        {
          title: "Token Operations",
          url: "/properties/owned/tokens",
        },
        {
          title: "Investor Relations",
          url: "/properties/owned/investors",
        },
        {
          title: "Performance Reports",
          url: "/properties/owned/reports",
        },
      ],
    },
    {
      title: "Marketplace",
      icon: IconShoppingCart,
      url: "/marketplace",
      items: [
        {
          title: "Active Listings",
          url: "/marketplace",
        },
        {
          title: "Trade History",
          url: "/marketplace/history",
        },
        {
          title: "Portfolio",
          url: "/marketplace/portfolio",
        },
        {
          title: "Watchlist",
          url: "/marketplace/watchlist",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Help",
      url: "/help",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "/search",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Documentation",
      url: "/docs",
      icon: IconFileDescription,
    },
    {
      name: "API Reference",
      url: "/docs/api",
      icon: IconFileAi,
    },
    {
      name: "Compliance Guide",
      url: "/docs/compliance",
      icon: IconReport,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userInfo = {
    name: user?.name as string,
    email: user?.email as string,
    avatar: "/avatars/shadcn.jpg",
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">EVM Farsquare</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userInfo} />
      </SidebarFooter>
    </Sidebar>
  )
}
