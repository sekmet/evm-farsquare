import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { useI18n } from "../contexts/I18nContext";
import { useAuth } from "../contexts/AuthContext";
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import Cookies from 'js-cookie';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
const location = useLocation();
const { language, setLanguage, t } = useI18n();
const { user, logout } = useAuth();

const defaultOpen = Cookies.get("sidebar_state") === "true" || true

return (
    <SidebarProvider
        defaultOpen={defaultOpen}
        style={
        {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
        }
    >
    <AppSidebar variant="inset" />
    <SidebarInset>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </SidebarInset>
  </SidebarProvider>
)

}