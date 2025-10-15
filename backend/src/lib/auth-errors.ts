/**
 * Authentication error handling utilities
 */

export interface AuthError {
  code: string;
  message: string;
  statusCode: number;
  userMessage: string;
  context?: Record<string, any>;
  timestamp?: number;
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SIWE_VERIFICATION_FAILED: 'SIWE_VERIFICATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type AuthErrorCode = typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS];

/**
 * Error templates for different authentication failure scenarios
 */
const ERROR_TEMPLATES: Record<AuthErrorCode, Omit<AuthError, 'message' | 'context' | 'timestamp'>> = {
  [AUTH_ERRORS.INVALID_CREDENTIALS]: {
    code: AUTH_ERRORS.INVALID_CREDENTIALS,
    statusCode: 401,
    userMessage: 'The email or password you entered is incorrect. Please try again.',
  },
  [AUTH_ERRORS.SIWE_VERIFICATION_FAILED]: {
    code: AUTH_ERRORS.SIWE_VERIFICATION_FAILED,
    statusCode: 401,
    userMessage: 'Wallet verification failed. Please try signing the message again.',
  },
  [AUTH_ERRORS.NETWORK_ERROR]: {
    code: AUTH_ERRORS.NETWORK_ERROR,
    statusCode: 503,
    userMessage: 'Network connection failed. Please check your internet connection and try again.',
  },
  [AUTH_ERRORS.DATABASE_ERROR]: {
    code: AUTH_ERRORS.DATABASE_ERROR,
    statusCode: 503,
    userMessage: 'Service temporarily unavailable. Please try again later.',
  },
  [AUTH_ERRORS.RATE_LIMITED]: {
    code: AUTH_ERRORS.RATE_LIMITED,
    statusCode: 429,
    userMessage: 'Too many attempts. Please wait a moment before trying again.',
  },
  [AUTH_ERRORS.UNKNOWN_ERROR]: {
    code: AUTH_ERRORS.UNKNOWN_ERROR,
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
  },
};

/**
 * Classify an error and return structured error information
 */
export function handleAuthError(
  error: Error | unknown,
  context?: Record<string, any>
): AuthError {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : 'unknown error';
  const timestamp = Date.now();

  let errorCode: AuthErrorCode;

  // Classify error based on message content
  if (errorMessage.includes('invalid') && (errorMessage.includes('credential') || errorMessage.includes('password'))) {
    errorCode = AUTH_ERRORS.INVALID_CREDENTIALS;
  } else if (errorMessage.includes('database') || errorMessage.includes('pool') || errorMessage.includes('query')) {
    errorCode = AUTH_ERRORS.DATABASE_ERROR;
  } else if (errorMessage.includes('siwe') || errorMessage.includes('verification') || errorMessage.includes('signature')) {
    errorCode = AUTH_ERRORS.SIWE_VERIFICATION_FAILED;
  } else if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
    errorCode = AUTH_ERRORS.NETWORK_ERROR;
  } else if (errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('too many')) {
    errorCode = AUTH_ERRORS.RATE_LIMITED;
  } else {
    errorCode = AUTH_ERRORS.UNKNOWN_ERROR;
  }

  const template = ERROR_TEMPLATES[errorCode];
  const message = error instanceof Error ? error.message : 'Unknown error';

  return {
    ...template,
    message,
    context,
    timestamp,
  };
}

/**
 * Create an HTTP response for authentication errors
 */
export function createAuthErrorResponse(error: AuthError): Response {
  const responseBody = {
    error: {
      code: error.code,
      message: error.userMessage, // User-friendly message
      timestamp: error.timestamp,
    },
    // Include detailed error info in development
    ...(process.env.NODE_ENV === 'development' && {
      details: {
        originalMessage: error.message,
        context: error.context,
        stack: error instanceof Error ? error.stack : undefined,
      },
    }),
  };

  return new Response(JSON.stringify(responseBody), {
    status: error.statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Middleware for handling authentication errors in routes
 */
export function withAuthErrorHandling(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      const authError = handleAuthError(error);
      console.error(`Auth error [${authError.code}]:`, authError.message, authError.context);

      return createAuthErrorResponse(authError);
    }
  };
}

/**
 * Validate authentication request data
 */
export function validateAuthRequest(email?: string, password?: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!email || email.trim() === '') {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!password || password.trim() === '') {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create custom authentication error
 */
export function createAuthError(
  code: AuthErrorCode,
  message: string,
  context?: Record<string, any>
): AuthError {
  const template = ERROR_TEMPLATES[code];

  return {
    ...template,
    message,
    context,
    timestamp: Date.now(),
  };
}

/**
 * Log authentication errors for monitoring
 */
export function logAuthError(error: AuthError): void {
  const logLevel = getLogLevel(error.code);

  const logMessage = `[${error.timestamp}] ${logLevel}: ${error.code} - ${error.message}`;

  if (error.context) {
    console.log(logMessage, error.context);
  } else {
    console.log(logMessage);
  }
}

/**
 * Determine log level based on error code
 */
function getLogLevel(errorCode: AuthErrorCode): string {
  switch (errorCode) {
    case AUTH_ERRORS.INVALID_CREDENTIALS:
    case AUTH_ERRORS.SIWE_VERIFICATION_FAILED:
      return 'WARN';
    case AUTH_ERRORS.DATABASE_ERROR:
    case AUTH_ERRORS.NETWORK_ERROR:
    case AUTH_ERRORS.RATE_LIMITED:
      return 'ERROR';
    case AUTH_ERRORS.UNKNOWN_ERROR:
    default:
      return 'ERROR';
  }
}

/**
 * Check if error should trigger rate limiting
 */
export function shouldRateLimit(error: AuthError): boolean {
  return [
    AUTH_ERRORS.INVALID_CREDENTIALS,
    AUTH_ERRORS.SIWE_VERIFICATION_FAILED,
  ].includes(error.code as AuthErrorCode);
}

/**
 * Get retry recommendations for different error types
 */
export function getRetryRecommendation(error: AuthError): {
  shouldRetry: boolean;
  delayMs?: number;
  maxRetries?: number;
} {
  switch (error.code) {
    case AUTH_ERRORS.NETWORK_ERROR:
      return { shouldRetry: true, delayMs: 1000, maxRetries: 3 };
    case AUTH_ERRORS.DATABASE_ERROR:
      return { shouldRetry: true, delayMs: 2000, maxRetries: 2 };
    case AUTH_ERRORS.INVALID_CREDENTIALS:
    case AUTH_ERRORS.SIWE_VERIFICATION_FAILED:
      return { shouldRetry: false };
    case AUTH_ERRORS.RATE_LIMITED:
      return { shouldRetry: true, delayMs: 60000, maxRetries: 1 }; // Wait 1 minute
    default:
      return { shouldRetry: false };
  }
}
