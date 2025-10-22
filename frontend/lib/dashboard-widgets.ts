// Dashboard widget system types and interfaces

export type WidgetSize = 'small' | 'medium' | 'large';

export type WidgetBadgeTone = 'default' | 'positive' | 'negative' | 'warning';

export interface WidgetMetadata {
  icon?: React.ReactNode;
  description?: React.ReactNode;
  value?: React.ReactNode;
  badge?: {
    label: React.ReactNode;
    tone?: WidgetBadgeTone;
    icon?: React.ReactNode;
  };
  footer?: {
    primary?: React.ReactNode;
    secondary?: React.ReactNode;
  };
}

export interface DashboardWidget {
  id: string;
  title: string;
  component: React.ComponentType<WidgetProps>;
  size: WidgetSize;
  permissions: string[];
  priority: number;
  category: string;
  meta?: WidgetMetadata;
  data?: WidgetProps['data'];
  onAction?: WidgetProps['onAction'];
}

export interface WidgetProps {
  className?: string;
  data?: any;
  onAction?: (payload: any) => void;
}

// Widget configuration for layout
export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

// Dashboard grid configuration
export interface DashboardConfig {
  widgets: DashboardWidget[];
  layout: WidgetLayout[];
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

// Predefined widget categories
export const WIDGET_CATEGORIES = {
  PORTFOLIO: 'portfolio',
  COMPLIANCE: 'compliance',
  TRADING: 'trading',
  PROPERTY: 'property',
  MARKET: 'market',
} as const;

export type WidgetCategory = typeof WIDGET_CATEGORIES[keyof typeof WIDGET_CATEGORIES];
