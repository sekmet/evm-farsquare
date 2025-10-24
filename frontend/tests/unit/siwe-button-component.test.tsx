/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/contexts/I18nContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SIWEButton } from "@/components/auth/SIWEButton";
import { WagmiProvider, createConfig, http } from 'wagmi';
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains';
import { injected } from 'wagmi/connectors';

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

// Mock window.ethereum for wallet detection
const mockEthereum = {
  request: mock(),
  isMetaMask: true,
  selectedAddress: "0x1234567890123456789012345678901234567890",
  chainId: "0x1"
};

// Create Wagmi config for testing
const config = createConfig({
  chains: [anvil],
  connectors: [
    injected(),
  ],
  transports: {
    [anvil.id]: http(),
  },
});

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    </WagmiProvider>
  );
}

describe("SIWE Button Component", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Clear all mocks before each test
    const clearMocks = (obj: any) => {
      if (typeof obj === 'function' && obj.mockClear) {
        obj.mockClear();
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(clearMocks);
      }
    };
    clearMocks(mockAuthClient);
    mockEthereum.request.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  test("should render SIWE button with proper text", () => {
    render(
      <TestWrapper>
        <SIWEButton />
      </TestWrapper>
    );

    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  test("should detect wallet availability", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    expect(button).not.toBeDisabled();
  });

  test("should show wallet not available when no ethereum provider", () => {
    // No wallet available
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    expect(button).toBeDisabled();
  });

  test("should handle SIWE sign-in flow", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    // Mock successful wallet connection
    mockEthereum.request.mockImplementation((args: any) => {
      if (args.method === "eth_requestAccounts") {
        return Promise.resolve(["0x1234567890123456789012345678901234567890"]);
      }
      if (args.method === "personal_sign") {
        return Promise.resolve("signature123");
      }
      return Promise.resolve();
    });

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(button);

    // Should call getNonce first
    await waitFor(() => {
      expect(mockAuthClient.signIn.siwe.getNonce).toHaveBeenCalled();
    });

    // Should request wallet connection
    expect(mockEthereum.request).toHaveBeenCalledWith({
      method: "eth_requestAccounts"
    });

    // Should request signature
    expect(mockEthereum.request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: expect.any(Array)
    });

    // Should call verify with signature
    await waitFor(() => {
      expect(mockAuthClient.signIn.siwe.verify).toHaveBeenCalled();
    });
  });

  test("should show loading states during connection", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    // Mock delayed wallet connection
    mockEthereum.request.mockImplementation((args: any) => {
      if (args.method === "eth_requestAccounts") {
        return new Promise(resolve => setTimeout(() => resolve(["0x123"]), 100));
      }
      return Promise.resolve();
    });

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(button);

    // Should show loading state
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText("Connecting...")).not.toBeInTheDocument();
    });
  });

  test("should handle wallet connection rejection", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    // Mock user rejecting connection
    mockEthereum.request.mockImplementation((args: any) => {
      if (args.method === "eth_requestAccounts") {
        return Promise.reject(new Error("User rejected the request"));
      }
      return Promise.resolve();
    });

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(button);

    // Should display error message
    await waitFor(() => {
      expect(screen.getByText("Wallet connection rejected")).toBeInTheDocument();
    });

    // Button should be re-enabled
    expect(button).not.toBeDisabled();
  });

  test("should handle signature rejection", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    // Mock connection success but signature rejection
    mockEthereum.request.mockImplementation((args: any) => {
      if (args.method === "eth_requestAccounts") {
        return Promise.resolve(["0x123"]);
      }
      if (args.method === "personal_sign") {
        return Promise.reject(new Error("User denied message signature"));
      }
      return Promise.resolve();
    });

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(button);

    // Should display signature error
    await waitFor(() => {
      expect(screen.getByText("Message signature rejected")).toBeInTheDocument();
    });
  });

  test("should handle SIWE verification failure", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    // Mock successful wallet interaction but verification failure
    mockEthereum.request.mockImplementation((args: any) => {
      if (args.method === "eth_requestAccounts") {
        return Promise.resolve(["0x123"]);
      }
      if (args.method === "personal_sign") {
        return Promise.resolve("signature123");
      }
      return Promise.resolve();
    });

    // Mock verification failure
    mockAuthClient.signIn.siwe.verify.mockImplementationOnce(() =>
      Promise.reject(new Error("Invalid signature"))
    );

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(button);

    // Should display verification error
    await waitFor(() => {
      expect(screen.getByText("SIWE verification failed")).toBeInTheDocument();
    });
  });

  test("should integrate with Ethereum provider", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(button);

    // Should detect ethereum provider
    await waitFor(() => {
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: "eth_requestAccounts"
      });
    });
  });

  test("should handle network errors gracefully", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    // Mock network error during signInWithEthereum
    mockAuthClient.signIn.siwe.getNonce.mockImplementationOnce(() =>
      Promise.reject(new Error("Network error"))
    );

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(button);

    // Should display network error
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  test("should support multiple wallet types", () => {
    // Test different wallet providers
    const wallets = [
      { name: "MetaMask", ethereum: { ...mockEthereum, isMetaMask: true } },
      { name: "Coinbase Wallet", ethereum: { ...mockEthereum, isCoinbaseWallet: true } },
      { name: "Generic Wallet", ethereum: { ...mockEthereum } }
    ];

    wallets.forEach(({ name, ethereum }) => {
      // Reset window.ethereum
      delete (window as any).ethereum;
      (window as any).ethereum = ethereum;

      const { rerender } = render(
        <MemoryRouter>
          <I18nProvider>
            <AuthProvider>
              <SIWEButton />
            </AuthProvider>
          </I18nProvider>
        </MemoryRouter>
      );

      const button = screen.getByRole("button", { name: /connect wallet/i });
      expect(button).not.toBeDisabled();

      cleanup();
    });
  });

  test("should handle wallet disconnection", async () => {
    // Mock wallet available then disconnected
    (window as any).ethereum = mockEthereum;

    // Mock connection success
    mockEthereum.request.mockImplementation((args: any) => {
      if (args.method === "eth_requestAccounts") {
        return Promise.resolve(["0x123"]);
      }
      return Promise.resolve();
    });

    const { rerender } = render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });

    // Simulate wallet disconnection
    delete (window as any).ethereum;

    rerender(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    // Button should be disabled
    expect(button).toBeDisabled();
  });

  test("should show proper loading text for different states", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    // Mock very slow responses to test different loading states
    let callCount = 0;
    mockEthereum.request.mockImplementation((args: any) => {
      callCount++;
      return new Promise(resolve => {
        setTimeout(() => {
          if (args.method === "eth_requestAccounts") {
            resolve(["0x123"]);
          } else {
            resolve("signature123");
          }
        }, 50);
      });
    });

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(button);

    // Should show connecting state
    expect(screen.getByText("Connecting...")).toBeInTheDocument();

    // Wait for connection to complete
    await waitFor(() => {
      expect(screen.queryByText("Connecting...")).not.toBeInTheDocument();
    });
  });

  test("should prevent multiple rapid clicks gracefully", async () => {
    // Mock wallet available
    (window as any).ethereum = mockEthereum;

    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });

    // Click multiple times rapidly
    await user.click(button);
    await user.click(button);
    await user.click(button);

    // Should only trigger once (button disabled during operation)
    await waitFor(() => {
      expect(mockAuthClient.signIn.siwe.getNonce).toHaveBeenCalledTimes(1);
    });
  });

  test("should support custom styling and variants", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <SIWEButton />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /connect wallet/i });

    // Should use shadcn Button component with proper styling
    expect(button).toHaveClass("inline-flex", "items-center");
  });
});

// Test component that uses the SIWE Button (this will be created in the implementation)
function SIWEButtonTest() {
  return (
    <div>
      {/* This will be replaced with the actual SIWEButton component */}
      <button>Connect Wallet</button>
      <div data-testid="loading-state"></div>
      <div data-testid="error-state"></div>
    </div>
  );
}
