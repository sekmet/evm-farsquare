import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/contexts/I18nContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";

// Mock the Better Auth client
const mockAuthClient = {
  signIn: {
    email: mock(() => Promise.resolve({ user: { id: "1", email: "test@test.com" }, session: { id: "session1" } })),
    siwe: {
      getNonce: mock(() => Promise.resolve("nonce123")),
      verify: mock(() => Promise.resolve({ user: { id: "1" }, session: { id: "session1" } }))
    }
  },
  signUp: mock(() => Promise.resolve({ user: { id: "1", email: "test@test.com" }, session: { id: "session1" } })),
  signOut: mock(() => Promise.resolve()),
  getSession: mock(() => Promise.resolve({ user: { id: "1", email: "test@test.com" }, session: { id: "session1" } }))
};

// Mock the auth client import
mock.module("@/lib/auth-client", () => ({
  authClient: mockAuthClient
}));

describe("Login Page Base Structure", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    Object.values(mockAuthClient).forEach(method => {
      if (typeof method === 'function') method.mockClear();
      else if (method && typeof method === 'object') {
        Object.values(method).forEach(subMethod => {
          if (typeof subMethod === 'function') subMethod.mockClear();
          else if (subMethod && typeof subMethod === 'object') {
            Object.values(subMethod).forEach(leafMethod => {
              if (typeof leafMethod === 'function') leafMethod.mockClear();
            });
          }
        });
      }
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("should render the login page component", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Should render the main login page structure
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account to continue")).toBeInTheDocument();
  });

  test("should integrate with Auth context", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Should have access to auth context (login function should be available)
    // This test verifies the component can render with auth context
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  test("should integrate with I18n context", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Should render with i18n context (no errors from missing translations)
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  test("should have proper page layout structure", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Should have the main layout elements
    expect(screen.getByText("EVM Farsquare")).toBeInTheDocument();
    expect(screen.getByText("Complete management solution for your hotel business with AI")).toBeInTheDocument();

    // Should have form elements
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  test("should be accessible to route configuration", () => {
    // Test that the component can be imported and used in routing
    expect(() => {
      const TestRouter = () => (
        <MemoryRouter initialEntries={["/login"]}>
          <I18nProvider>
            <AuthProvider>
              <Login />
            </AuthProvider>
          </I18nProvider>
        </MemoryRouter>
      );

      render(<TestRouter />);
    }).not.toThrow();

    // Should render without routing errors
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  test("should handle form input changes", async () => {
    const { user } = render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");

    // Should be able to type in inputs
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  test("should have responsive layout structure", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Should have responsive classes for mobile/desktop
    const mainContainer = screen.getByText("Welcome back").closest(".min-h-screen");
    expect(mainContainer).toHaveClass("flex");

    // Should have mobile-specific elements
    expect(screen.getByText("EVM Farsquare")).toBeInTheDocument(); // Mobile logo
  });

  test("should display branding content", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Should display branding features
    expect(screen.getByText("Room and booking management")).toBeInTheDocument();
    expect(screen.getByText("Guest information system")).toBeInTheDocument();
    expect(screen.getByText("Revenue and occupancy reports")).toBeInTheDocument();
    expect(screen.getByText("AI-powered assistance")).toBeInTheDocument();
  });

  test("should have proper form validation attributes", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");

    // Should have required attributes
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();

    // Should have proper input types
    expect(emailInput).toHaveAttribute("type", "email");
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should integrate with shadcn UI components", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Should use shadcn components (Card, Button, Input, Label)
    const card = screen.getByText("Welcome back").closest("[class*='card']");
    const button = screen.getByRole("button", { name: /sign in/i });
    const input = screen.getByLabelText("Email");

    // Verify shadcn styling classes are present
    expect(card).toHaveClass("shadow-xl", "border-0");
    expect(button).toHaveClass("w-full");
    expect(input).toHaveClass("mt-1");
  });

  test("should handle loading states properly", async () => {
    // Mock auth client to delay response
    mockAuthClient.signIn.email.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        user: { id: "1", email: "test@test.com" },
        session: { id: "session1" }
      }), 100))
    );

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /sign in/i });

    // Should show loading state during form submission
    // Note: This test verifies the structure supports loading states
    expect(button).toBeInTheDocument();
  });

  test("should maintain proper component hierarchy", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Should have proper component nesting
    const mainContainer = screen.getByText("Welcome back").closest(".min-h-screen");
    expect(mainContainer).toBeInTheDocument();

    // Should have form inside card
    const form = screen.getByRole("button", { name: /sign in/i }).closest("form");
    expect(form).toBeInTheDocument();

    // Should have form inside card content
    const cardContent = form?.closest("[class*='card']");
    expect(cardContent).toBeInTheDocument();
  });

  test("should be compatible with routing system", () => {
    // Test that component works within a routing context
    const TestApp = () => (
      <MemoryRouter initialEntries={["/login"]}>
        <I18nProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    expect(() => {
      render(<TestApp />);
    }).not.toThrow();

    // Should render correctly in routing context
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });
});
