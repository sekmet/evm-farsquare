import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppSidebar } from "../app-sidebar";

// Mock the auth context
const mockAuth = {
  user: { name: "Test User", email: "test@example.com" },
  logout: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AppSidebar", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderSidebar = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppSidebar />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  test("should render main navigation items", () => {
    renderSidebar();

    // Check main navigation items from specs
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Properties")).toBeInTheDocument();
    expect(screen.getByText("Marketplace")).toBeInTheDocument();
    expect(screen.getByText("Tokens")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
  });

  test("should render property owner navigation sections", () => {
    renderSidebar();

    // Check property owner navigation
    expect(screen.getByText("My Properties")).toBeInTheDocument();
    expect(screen.getByText("Property Management")).toBeInTheDocument();
    expect(screen.getByText("Token Operations")).toBeInTheDocument();
    expect(screen.getByText("Investor Relations")).toBeInTheDocument();
    expect(screen.getByText("Performance Reports")).toBeInTheDocument();
  });

  test("should render marketplace navigation sections", () => {
    renderSidebar();

    // Check marketplace navigation
    expect(screen.getByText("Active Listings")).toBeInTheDocument();
    expect(screen.getByText("Trade History")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  test("should render secondary navigation items", () => {
    renderSidebar();

    // Check secondary navigation
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
  });

  test("should render documentation links", () => {
    renderSidebar();

    // Check documentation section
    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(screen.getByText("API Reference")).toBeInTheDocument();
    expect(screen.getByText("Compliance Guide")).toBeInTheDocument();
  });

  test("should display user information", () => {
    renderSidebar();

    // Check user information display
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  test("should have correct navigation URLs", () => {
    renderSidebar();

    // Check that navigation items have correct URLs from specs
    const dashboardLink = screen.getByText("Dashboard").closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    const propertiesLink = screen.getByText("Properties").closest('a');
    expect(propertiesLink).toHaveAttribute('href', '/properties');

    const marketplaceLink = screen.getByText("Marketplace").closest('a');
    expect(marketplaceLink).toHaveAttribute('href', '/marketplace');

    const tokensLink = screen.getByText("Tokens").closest('a');
    expect(tokensLink).toHaveAttribute('href', '/tokens');
  });

  test("should render without crashing", () => {
    expect(() => renderSidebar()).not.toThrow();
  });
});
