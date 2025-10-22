import React from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  type DashboardWidget,
  type WidgetProps,
  type WidgetBadgeTone,
} from "@/lib/dashboard-widgets";

interface DashboardGridProps {
  widgets: DashboardWidget[];
  loading?: boolean;
  className?: string;
}

interface WidgetWrapperProps extends WidgetProps {
  widget: DashboardWidget;
  loading?: boolean;
  className?: string;
}

const badgeVariantMap: Record<WidgetBadgeTone, "outline" | "default" | "destructive" | "secondary"> = {
  default: "outline",
  positive: "default",
  negative: "destructive",
  warning: "secondary",
};

const baseCardClasses = "@container/card relative overflow-hidden bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card";

function WidgetWrapper({ widget, loading, className, ...props }: WidgetWrapperProps) {
  const sizeClasses = {
    small: "col-span-1 row-span-1",
    medium: "col-span-2 row-span-1",
    large: "col-span-2 row-span-2",
  };

  const cardClassName = cn(sizeClasses[widget.size], baseCardClasses, className);

  if (loading) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="gap-2 pb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </CardFooter>
      </Card>
    );
  }

  const WidgetComponent = widget.component;
  const meta = widget.meta;
  const description = meta?.description ?? widget.title;
  const value = meta?.value ?? widget.title;
  const badge = meta?.badge;
  const footerPrimary = meta?.footer?.primary;
  const footerSecondary = meta?.footer?.secondary;
  const badgeVariant = badge ? badgeVariantMap[badge.tone ?? "default"] : undefined;
  const showDescription = Boolean(meta?.icon || meta?.description);
  const showFooter = Boolean(footerPrimary || footerSecondary);

  return (
    <Card className={cardClassName} data-testid={`${widget.id}-widget`}>
      <CardHeader className="gap-3 pb-4">
        {showDescription && (
          <CardDescription className="flex items-center gap-2 text-sm">
            {meta?.icon}
            {description}
          </CardDescription>
        )}
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {badge && (
          <CardAction>
            <Badge variant={badgeVariant}>
              {badge.icon}
              {badge.label}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <WidgetComponent {...props} />
      </CardContent>
      {showFooter && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {footerPrimary && (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {footerPrimary}
            </div>
          )}
          {footerSecondary && (
            <div className="text-muted-foreground">
              {footerSecondary}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export function DashboardGrid({ widgets, loading = false, className }: DashboardGridProps) {
  // Sort widgets by priority for consistent layout
  const sortedWidgets = [...widgets].sort((a, b) => a.priority - b.priority);

  return (
    <div
      className={cn(
        // Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop
        "grid gap-4",
        "grid-cols-1", // mobile
        "md:grid-cols-2", // tablet
        "lg:grid-cols-3", // desktop
        className
      )}
    >
      {sortedWidgets.map((widget) => (
        <WidgetWrapper key={widget.id} widget={widget} loading={loading} />
      ))}
    </div>
  );
}

// Hook for managing dashboard widgets
export function useDashboardWidgets() {
  // This would typically fetch from an API or configuration
  // For now, return empty array - widgets will be added in subsequent tasks
  return {
    widgets: [],
    loading: false,
    error: null,
  };
}
