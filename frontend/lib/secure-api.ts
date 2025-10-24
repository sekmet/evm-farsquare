// Client-side API client that calls server endpoints

// API response wrapper for secure error handling
interface SecureApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Client-side API client class
export class SecureApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Make HTTP request to server API (public method for generic requests)
   */
  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<SecureApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to communicate with server",
          details: error instanceof Error ? error.message : "Unknown error"
        },
      };
    }
  }

  /**
   * Make HTTP request to server API (private implementation)
   */
  private async makeRequestPrivate<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<SecureApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to communicate with server",
          details: error instanceof Error ? error.message : "Unknown error"
        },
      };
    }
  }

  /**
   * Create wallet securely
   */
  async createWallet(walletName: string): Promise<SecureApiResponse> {
    return this.makeRequestPrivate("/api/wallets", {
      method: "POST",
      body: JSON.stringify({ walletName }),
    });
  }

  /**
   * Get wallet information
   */
  async getWallet(walletId: string): Promise<SecureApiResponse> {
    return this.makeRequestPrivate(`/api/wallets/${walletId}`);
  }

  /**
   * List wallets
   */
  async listWallets(): Promise<SecureApiResponse> {
    return this.makeRequestPrivate("/api/wallets");
  }

  /**
   * Sign raw payload
   */
  async signRawPayload(payload: string, signWith: string): Promise<SecureApiResponse> {
    return this.makeRequestPrivate("/api/sign", {
      method: "POST",
      body: JSON.stringify({ payload, signWith }),
    });
  }
}

// Factory function to create secure API client
export const createSecureApiClient = (baseUrl?: string): SecureApiClient => {
  return new SecureApiClient(baseUrl);
};

// Environment-based client factory
export const createSecureApiClientFromEnv = (): SecureApiClient => {
  const baseUrl = import.meta.env.VITE_DEV
    ? "http://localhost:3000"
    : "https://api.farsquare.xyz"; // Production URL would go here

  return createSecureApiClient(baseUrl);
};

// Export types
export type { SecureApiResponse };
