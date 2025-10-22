import { describe, test, expect, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'viem/chains';
import { injected } from 'wagmi/connectors';

// Create Wagmi config for testing
const config = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
  },
});

// Mock Wagmi hooks
const mockUseAccount = { address: "0x123", isConnected: true };
const mockUseBalance = { data: { formatted: "100.5", symbol: "HBAR" } };

mock.module("wagmi", () => ({
  useAccount: () => mockUseAccount,
  useBalance: () => mockUseBalance,
}));

// Mock sidebar
mock.module("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Trigger</button>,
}));

// Mock theme components
mock.module("@/components/mode-toggle", () => ({
  ModeToggle: () => <button data-testid="mode-toggle">Mode</button>,
}));

mock.module("@/components/theme-selector", () => ({
  ThemeSelector: () => <button data-testid="theme-selector">Theme</button>,
}));

// Mock tabler icons
mock.module("@tabler/icons-react", () => ({
  IconBell: () => <div data-testid="icon-bell" />,
  IconWallet: () => <div data-testid="icon-wallet" />,
  IconPlus: () => <div data-testid="icon-plus" />,
  IconShieldCheck: () => <div data-testid="icon-shield-check" />,
  IconUser: () => <div data-testid="icon-user" />,
  IconSettings: () => <div data-testid="icon-settings" />,
  IconCreditCard: () => <div data-testid="icon-credit-card" />,
}));

describe("SiteHeader", () => {
  const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <AuthProvider>
              {component}
            </AuthProvider>
          </I18nProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  };

  test("should render header with sidebar trigger", () => {
    renderWithProviders(<SiteHeader />);
    expect(screen.getByTestId("sidebar-trigger")).toBeDefined();
  });

  test("should render theme controls", () => {
    renderWithProviders(<SiteHeader />);
    expect(screen.getByTestId("mode-toggle")).toBeDefined();
    expect(screen.getByTestId("theme-selector")).toBeDefined();
  });

  // Failing tests for features we need to implement
  test("should display user profile dropdown with avatar", () => {
    renderWithProviders(<SiteHeader />);
    expect(screen.getByTestId("user-profile-dropdown")).toBeDefined();
  });

  test("should show notification bell with badge count", () => {
    renderWithProviders(<SiteHeader />);
    expect(screen.getByTestId("notification-bell")).toBeDefined();
  });

  test("should display wallet balance (HBAR and tokens)", () => {
    renderWithProviders(<SiteHeader />);
    expect(screen.getByTestId("wallet-balance")).toBeDefined();
  });

  test("should render quick action buttons (Tokenize Asset, View Compliance)", () => {
    renderWithProviders(<SiteHeader />);
    expect(screen.getByTestId("quick-actions")).toBeDefined();
  });
});
