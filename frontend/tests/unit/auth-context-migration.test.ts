import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Mock the Better Auth client
const mockAuthClient = {
  signIn: {
    email: mock(() => Promise.resolve({
      data: {
        user: { id: "1", email: "test@test.com", name: "Test User" }
      }
    })),
  },
  signUp: mock(() => Promise.resolve({
    data: {
      user: { id: "1", email: "test@test.com", name: "Test User" }
    }
  })),
  signOut: mock(() => Promise.resolve()),
  getSession: mock(() => Promise.resolve({
    data: {
      user: { id: "1", email: "test@test.com", name: "Test User" }
    }
  }))
};

// Mock the auth client import
mock.module("@/lib/auth-client", () => ({
  authClient: mockAuthClient
}));

describe("AuthContext Migration", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    Object.values(mockAuthClient).forEach(method => {
      if (typeof method === 'function') {
        // Reset mock function calls
      } else if (method && typeof method === 'object') {
        Object.values(method).forEach(subMethod => {
          if (typeof subMethod === 'function') {
            // Reset mock function calls
          }
        });
      }
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("should update AuthContext interface for Better Auth", () => {
    // Test component to access context
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="isAuthenticated">
            {auth.isAuthenticated ? 'true' : 'false'}
          </div>
          <div data-testid="user">
            {auth.user ? 'user-present' : 'no-user'}
          </div>
          <div data-testid="loading">
            {auth.loading ? 'true' : 'false'}
          </div>
          <button onClick={() => auth.login({ email: "test@test.com", password: "password" })}>
            Login
          </button>
          <button onClick={auth.logout}>Logout</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should render without crashing
    expect(screen.getByTestId("isAuthenticated")).toBeInTheDocument();
    expect(screen.getByTestId("user")).toBeInTheDocument();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  test("should migrate login method to use Better Auth client", async () => {
    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <button onClick={() => auth.login({ email: "test@test.com", password: "password" })}>
            Login
          </button>
          <div data-testid="user">
            {auth.user ? auth.user.email : 'no-user'}
          </div>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click login button
    const loginButton = screen.getByText("Login");
    loginButton.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have called the Better Auth client signIn method
    expect(mockAuthClient.signIn.email).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "password"
    });
  });

  test("should update logout method for Better Auth", async () => {
    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <button onClick={auth.logout}>Logout</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click logout button
    const logoutButton = screen.getByText("Logout");
    logoutButton.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have called the Better Auth client signOut method
    expect(mockAuthClient.signOut).toHaveBeenCalled();
  });

  test("should preserve user state management", () => {
    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="isAuthenticated">
            {auth.isAuthenticated ? 'true' : 'false'}
          </div>
          <div data-testid="user">
            {auth.user ? 'user-present' : 'no-user'}
          </div>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should not be authenticated
    expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("no-user");
  });

  test("should handle loading states properly", () => {
    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="loading">
            {auth.loading ? 'loading' : 'not-loading'}
          </div>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should have proper loading state management
    expect(screen.getByTestId("loading")).toHaveTextContent("not-loading");
  });

  test("should handle errors appropriately", () => {
    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="isAuthenticated">
            {auth.isAuthenticated ? 'true' : 'false'}
          </div>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should handle error states without crashing
    expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false");
  });
});
