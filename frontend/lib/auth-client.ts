import { createAuthClient } from "better-auth/client";
import { siweClient } from "better-auth/client/plugins";

/**
 * Better Auth Client Configuration
 *
 * Configures the client for Better Auth integration with the backend API.
 * This client handles authentication state management, session handling, and
 * communication with the Better Auth backend endpoints.
 */

// Custom fetch function to ensure proper JSON serialization
const customFetch = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    body: init?.body && typeof init.body === 'object' ? JSON.stringify(init.body) : init?.body,
  });
  return response;
};

// Create and export the auth client
export const authClient = createAuthClient({
  // Base URL for the Better Auth API endpoints
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",

  // Custom fetch function for proper JSON serialization
  fetch: customFetch,

  // Fetch options for API requests
  fetchOptions: {
    // Include credentials (cookies) in requests
    credentials: "include",
  },

  // Add SIWE plugin
  plugins: [siweClient()],

  // Additional client configuration
  // Note: SIWE plugin configuration is handled on the backend
  // The React client automatically supports all backend-configured providers
});

// Export the client for use in components and hooks
export default authClient;

// Type exports for TypeScript support
export type { User, Session } from "better-auth";

// Re-export commonly used hooks and utilities
// Note: useAuth hook is provided by AuthContext, not better-auth/react
