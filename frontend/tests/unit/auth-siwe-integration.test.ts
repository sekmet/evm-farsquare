import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

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

describe("SIWE Authentication Integration", () => {
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

  test("should implement getSIWENonce method for nonce retrieval", async () => {
    // Test component to access context
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <button onClick={async () => {
            try {
              const nonce = await auth.getSIWENonce();
              console.log('Nonce:', nonce);
            } catch (error) {
              console.error('Error:', error);
            }
          }}>
            Get Nonce
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click get nonce button
    const getNonceButton = screen.getByText("Get Nonce");
    getNonceButton.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have called the Better Auth client SIWE getNonce method
    expect(mockAuthClient.signIn.siwe.getNonce).toHaveBeenCalled();
  });

  test("should handle SIWE nonce retrieval errors", async () => {
    // Mock nonce retrieval to fail
    mockAuthClient.signIn.siwe.getNonce.mockImplementationOnce(() =>
      Promise.reject(new Error("Network error"))
    );

    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <button onClick={async () => {
            try {
              await auth.getSIWENonce();
            } catch (error) {
              console.error('Expected error:', error.message);
            }
          }}>
            Get Nonce Error
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click button that should cause an error
    const button = screen.getByText("Get Nonce Error");
    button.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have called getNonce and handled the error
    expect(mockAuthClient.signIn.siwe.getNonce).toHaveBeenCalled();
  });

  test("should implement signInWithEthereum method", async () => {
    // Mock successful SIWE verification
    mockAuthClient.signIn.siwe.verify.mockImplementationOnce(() =>
      Promise.resolve({
        user: { id: "1", email: "wallet@test.com" },
        session: { id: "session1" }
      })
    );

    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <button onClick={async () => {
            try {
              await auth.signInWithEthereum();
              console.log('SIWE login successful');
            } catch (error) {
              console.error('SIWE login failed:', error);
            }
          }}>
            SIWE Login
          </button>
          <div data-testid="user">{auth.user ? auth.user.email : 'no-user'}</div>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click SIWE login button
    const siweButton = screen.getByText("SIWE Login");
    siweButton.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have called the Better Auth client SIWE verify method
    expect(mockAuthClient.signIn.siwe.verify).toHaveBeenCalled();
  });

  test("should handle SIWE authentication errors", async () => {
    // Mock SIWE verification to fail
    mockAuthClient.signIn.siwe.verify.mockImplementationOnce(() =>
      Promise.reject(new Error("Wallet signature invalid"))
    );

    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <button onClick={async () => {
            try {
              await auth.signInWithEthereum();
            } catch (error) {
              console.error('Expected SIWE error:', error.message);
            }
          }}>
            SIWE Login Error
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click button that should cause an error
    const button = screen.getByText("SIWE Login Error");
    button.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have called verify and handled the error
    expect(mockAuthClient.signIn.siwe.verify).toHaveBeenCalled();
  });

  test("should handle wallet connection scenarios", () => {
    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="hasSIWE">{auth.signInWithEthereum ? 'true' : 'false'}</div>
          <div data-testid="hasNonce">{auth.getSIWENonce ? 'true' : 'false'}</div>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should have SIWE methods available
    expect(screen.getByTestId("hasSIWE")).toHaveTextContent("true");
    expect(screen.getByTestId("hasNonce")).toHaveTextContent("true");
  });

  test("should handle SIWE message creation and signing flow", async () => {
    // Mock successful flow
    let verifyCalledWith: any = null;
    mockAuthClient.signIn.siwe.verify.mockImplementationOnce((params) => {
      verifyCalledWith = params;
      return Promise.resolve({
        user: { id: "1", email: "wallet@test.com" },
        session: { id: "session1" }
      });
    });

    // Test component
    function TestComponent() {
      const auth = useAuth();
      return (
        <div>
          <button onClick={async () => {
            // Simulate the full SIWE flow
            try {
              const nonce = await auth.getSIWENonce();
              // In real implementation, this would create and sign the SIWE message
              // For testing, we'll call signInWithEthereum directly
              await auth.signInWithEthereum();
            } catch (error) {
              console.error('SIWE flow error:', error);
            }
          }}>
            Full SIWE Flow
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click button to trigger full flow
    const button = screen.getByText("Full SIWE Flow");
    button.click();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have called both methods
    expect(mockAuthClient.signIn.siwe.getNonce).toHaveBeenCalled();
    expect(mockAuthClient.signIn.siwe.verify).toHaveBeenCalled();
  });
});
