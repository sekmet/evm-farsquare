import { vi } from 'vitest';
import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement, Component } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';

/**
 * Enhanced test utilities for comprehensive testing infrastructure
 */

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withAuth?: boolean;
  withI18n?: boolean;
  authProps?: {
    user?: any;
    isAuthenticated?: boolean;
  };
  i18nProps?: {
    locale?: string;
  };
}

export function renderWithProviders(
  ui: ReactElement,
  {
    withAuth = true,
    withI18n = true,
    authProps = {},
    i18nProps = { locale: 'en' },
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    let component = <>{children}</>;

    if (withI18n) {
      component = (
        <I18nProvider locale={i18nProps.locale}>
          {component}
        </I18nProvider>
      );
    }

    if (withAuth) {
      component = (
        <AuthProvider {...authProps}>
          {component}
        </AuthProvider>
      );
    }

    return component;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock implementations for common external dependencies
export const createMockAuthClient = () => ({
  signIn: {
    email: vi.fn(() => Promise.resolve({
      data: { user: { id: '1', email: 'test@test.com', name: 'Test User' } }
    })),
  },
  signUp: vi.fn(() => Promise.resolve({
    data: { user: { id: '1', email: 'test@test.com', name: 'Test User' } }
  })),
  signOut: vi.fn(() => Promise.resolve()),
  getSession: vi.fn(() => Promise.resolve({
    data: { user: { id: '1', email: 'test@test.com', name: 'Test User' } }
  })),
});

export const createMockFetch = () => {
  const mockFn = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    })
  );

  global.fetch = mockFn;
  return mockFn;
};

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestSession = (overrides = {}) => ({
  id: 'session-456',
  userId: 'user-123',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  token: 'jwt-token-123',
  ...overrides,
});

// Environment setup helpers
export const setupTestEnvironment = (env = {}) => {
  const originalEnv = { ...process.env };

  // Set test environment variables
  process.env.VITE_API_BASE_URL = 'http://localhost:3000';
  process.env.VITE_DEMO_MODE = 'true';
  process.env.NODE_ENV = 'test';

  // Apply custom environment overrides
  Object.assign(process.env, env);

  return () => {
    // Cleanup function to restore original environment
    process.env = originalEnv;
  };
};

// Async test helpers
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const waitForMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock localStorage for testing
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Component testing helpers
export const createComponentTestProps = (componentName: string) => ({
  'data-testid': `${componentName}-test`,
  'data-component': componentName,
});

// Error boundary testing
export class TestErrorBoundary extends Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Error occurred</div>;
    }

    return this.props.children;
  }
}

// Accessibility testing helpers
export const axeConfig = {
  rules: {
    // Customize axe rules for our specific needs
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
  },
};

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const expectToBeFast = (duration: number, threshold = 100) => {
  expect(duration).toBeLessThan(threshold);
};

// Integration test helpers
export const createIntegrationTestSetup = () => {
  const cleanupFunctions: (() => void)[] = [];

  const addCleanup = (fn: () => void) => {
    cleanupFunctions.push(fn);
  };

  const runAllCleanup = async () => {
    for (const cleanup of cleanupFunctions.reverse()) {
      await cleanup();
    }
  };

  return { addCleanup, runAllCleanup };
};
