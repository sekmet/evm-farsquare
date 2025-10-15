import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";

interface LoginLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: "mobile" | "desktop" | "auto";
}

/**
 * Enhanced Login Layout Component
 *
 * Provides a responsive, mobile-first layout for the login page with:
 * - Card-based design for content containment
 * - Mobile-friendly responsive breakpoints
 * - Consistent spacing and typography
 * - Enhanced accessibility features
 * - Theme integration support
 * - Improved visual hierarchy
 */
export function LoginLayout({
  children,
  title,
  subtitle,
  className = "",
  variant = "auto"
}: LoginLayoutProps) {
  const { t } = useI18n();

  // Default title and subtitle if not provided
  const layoutTitle = title || t("auth.login.title") || "Welcome Back";
  const layoutSubtitle = subtitle || t("auth.login.subtitle") || "Sign in to your account";

  // Determine layout variant based on screen size or explicit variant
  const shouldUseDesktopLayout = variant === "desktop" ||
    (variant === "auto" && typeof window !== "undefined" && window.innerWidth >= 1024);

  if (shouldUseDesktopLayout) {
    return (
      <DesktopLoginLayout
        title={layoutTitle}
        subtitle={layoutSubtitle}
        className={className}
      >
        {children}
      </DesktopLoginLayout>
    );
  }

  return (
    <MobileLoginLayout
      title={layoutTitle}
      subtitle={layoutSubtitle}
      className={className}
    >
      {children}
    </MobileLoginLayout>
  );
}

/**
 * Mobile-optimized layout component
 * Designed specifically for mobile devices with touch-friendly interactions
 */
export function MobileLoginLayout({
  children,
  title,
  subtitle,
  className = ""
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 px-4 py-6 ${className}`}>
      {/* Header section - optimized for mobile */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        {/* Logo/branding area */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center mb-4 shadow-sm">
            <span className="text-primary-foreground font-bold text-lg">
              PMS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Main login card - optimized for mobile */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="space-y-1 pb-4 px-6 pt-6">
            <CardTitle className="sr-only">
              {title}
            </CardTitle>
            <CardDescription className="sr-only">
              {subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-6">
            {children}
          </CardContent>
        </Card>

        {/* Footer section - mobile optimized */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
          <p>
            Need help?{" "}
            <a
              href="/support"
              className="font-medium text-primary hover:text-primary/80 transition-colors underline"
            >
              Contact Support
            </a>
          </p>
          <p className="text-gray-400 dark:text-gray-500">
            © 2025 EVM Farsquare. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop layout with enhanced features and branding panel
 */
export function DesktopLoginLayout({
  children,
  title,
  subtitle,
  className = ""
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div className={`min-h-screen flex ${className}`}>
      {/* Left panel for branding/additional content */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="mx-auto max-w-lg">
          {/* Enhanced branding section */}
          <div className="text-center mb-12">
            <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <span className="text-primary-foreground font-bold text-xl">
                PMS
              </span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
              Property Management System
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
              Streamline your property operations with our comprehensive management platform.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 gap-6 mb-12">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Secure & Reliable
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Enterprise-grade security with 99.9% uptime guarantee
              </div>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Lightning Fast
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Optimized performance with modern web technologies
              </div>
            </div>
          </div>

          {/* Additional branding content */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Join thousands of property managers worldwide</p>
          </div>
        </div>
      </div>

      {/* Right panel for login form */}
      <div className="flex-1 lg:flex-none lg:w-[480px] flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Login form card */}
          <Card className="shadow-2xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6 px-8 pt-8">
              <CardTitle className="sr-only">
                {title}
              </CardTitle>
              <CardDescription className="sr-only">
                {subtitle}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-8 pb-8">
              {children}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>
              Need help?{" "}
              <a
                href="/support"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
