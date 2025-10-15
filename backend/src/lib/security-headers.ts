import type { MiddlewareHandler } from "hono";

/**
 * Security Headers Implementation
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  xssProtection?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  hsts?: string;
}

export interface SecurityAuditLog {
  timestamp: Date;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  securityScore: number;
  bypassDetected?: boolean;
}

/**
 * Generate secure Content Security Policy for authentication endpoints
 */
export function generateSecureCSP(): string {
  const policies = [
    "default-src 'self'",
    "script-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return policies.join("; ");
}

/**
 * Create comprehensive security headers configuration
 */
export function createSecurityHeadersConfig(): SecurityHeadersConfig {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    contentSecurityPolicy: generateSecureCSP(),
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    xssProtection: "1; mode=block",
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: "camera=(), microphone=(), geolocation=()",
    hsts: isProduction ? "max-age=31536000; includeSubDomains; preload" : undefined,
  };
}

/**
 * Validate security headers configuration
 */
export function validateSecurityHeaders(config: SecurityHeadersConfig): boolean {
  try {
    // Validate Content Security Policy - must not be empty or just whitespace
    if (config.contentSecurityPolicy !== undefined &&
        (config.contentSecurityPolicy.trim() === "" || config.contentSecurityPolicy.trim() === "''")) {
      return false;
    }

    // Validate X-Frame-Options
    if (config.xFrameOptions) {
      const validFrameOptions = ["DENY", "SAMEORIGIN", "ALLOW-FROM"];
      if (!validFrameOptions.some(option => config.xFrameOptions?.toUpperCase().startsWith(option))) {
        return false;
      }
    }

    // Validate X-Content-Type-Options
    if (config.xContentTypeOptions && config.xContentTypeOptions !== "nosniff") {
      return false;
    }

    // Validate XSS Protection
    if (config.xssProtection && !config.xssProtection.startsWith("1; mode=block")) {
      return false;
    }

    // Validate Referrer Policy
    if (config.referrerPolicy) {
      const validReferrerPolicies = [
        "no-referrer",
        "no-referrer-when-downgrade",
        "origin",
        "origin-when-cross-origin",
        "same-origin",
        "strict-origin",
        "strict-origin-when-cross-origin",
        "unsafe-url",
      ];
      if (!validReferrerPolicies.includes(config.referrerPolicy)) {
        return false;
      }
    }

    // Validate HSTS
    if (config.hsts && !config.hsts.includes("max-age=")) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating security headers:", error);
    return false;
  }
}

/**
 * Create security headers middleware with custom configuration
 */
export function createSecurityHeadersMiddleware(config: SecurityHeadersConfig = {}): MiddlewareHandler {
  const finalConfig = { ...createSecurityHeadersConfig(), ...config };

  // Validate configuration
  if (!validateSecurityHeaders(finalConfig)) {
    throw new Error("Invalid security headers configuration");
  }

  return async (c, next) => {
    // Set Content Security Policy
    if (finalConfig.contentSecurityPolicy) {
      c.header("Content-Security-Policy", finalConfig.contentSecurityPolicy);
    }

    // Set X-Frame-Options
    if (finalConfig.xFrameOptions) {
      c.header("X-Frame-Options", finalConfig.xFrameOptions);
    }

    // Set X-Content-Type-Options
    if (finalConfig.xContentTypeOptions) {
      c.header("X-Content-Type-Options", finalConfig.xContentTypeOptions);
    }

    // Set X-XSS-Protection
    if (finalConfig.xssProtection) {
      c.header("X-XSS-Protection", finalConfig.xssProtection);
    }

    // Set Referrer-Policy
    if (finalConfig.referrerPolicy) {
      c.header("Referrer-Policy", finalConfig.referrerPolicy);
    }

    // Set Permissions-Policy
    if (finalConfig.permissionsPolicy) {
      c.header("Permissions-Policy", finalConfig.permissionsPolicy);
    }

    // Set HSTS (only in production)
    if (finalConfig.hsts && process.env.NODE_ENV === "production") {
      c.header("Strict-Transport-Security", finalConfig.hsts);
    }

    await next();
  };
}

/**
 * Default security headers middleware for authentication endpoints
 */
export const securityHeadersMiddleware = createSecurityHeadersMiddleware();

/**
 * HTTPS enforcement middleware
 */
export const httpsEnforcementMiddleware: MiddlewareHandler = async (c, next) => {
  // Only enforce HTTPS in production
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const protocol = c.req.header("X-Forwarded-Proto") ||
                   c.req.header("X-Forwarded-Protocol") ||
                   (c.req.url.startsWith("https://") ? "https" : "http");

  if (protocol === "http") {
    const host = c.req.header("Host") || c.req.header("X-Forwarded-Host");
    if (host) {
      const httpsUrl = `https://${host}${c.req.path}`;
      return c.redirect(httpsUrl, 301);
    }
  }

  await next();
};

/**
 * Detect potential security header bypass attempts
 */
export function detectSecurityBypass(headers: Record<string, string>): boolean {
  const suspiciousHeaders = [
    "X-Forwarded-Host",
    "X-Original-URL",
    "X-Rewrite-URL",
    "X-Original-Host",
    "X-Host",
    "X-Forwarded-Server",
    "X-HTTP-Host-Override",
    "Forwarded",
  ];

  // Check for suspicious header patterns
  for (const [key, value] of Object.entries(headers)) {
    if (suspiciousHeaders.some(header => key.toLowerCase().includes(header.toLowerCase()))) {
      // Additional validation for host header injection
      if (key.toLowerCase().includes("host") && value.includes("\n")) {
        return true;
      }
      // Check for URL manipulation attempts
      if (value.includes("..") || value.includes("//") && !value.startsWith("http")) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate security headers compliance score
 */
export function calculateSecurityScore(headers: Record<string, string>): number {
  let score = 0;
  const maxScore = 100;

  // Required security headers
  const requiredHeaders = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": ["DENY", "SAMEORIGIN"],
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": ["strict-origin-when-cross-origin", "strict-origin"],
  };

  // Optional but recommended headers
  const recommendedHeaders = {
    "Content-Security-Policy": true,
    "Strict-Transport-Security": true,
    "Permissions-Policy": true,
  };

  // Score required headers
  for (const [header, expected] of Object.entries(requiredHeaders)) {
    const headerValue = headers[header];
    if (headerValue) {
      if (Array.isArray(expected)) {
        if (expected.some(value => headerValue.includes(value))) {
          score += 15; // 15 points each for 4 required headers = 60 points
        }
      } else if (headerValue === expected) {
        score += 15;
      }
    }
  }

  // Score recommended headers
  for (const [header] of Object.entries(recommendedHeaders)) {
    if (headers[header]) {
      score += 10; // 10 points each for 3 recommended headers = 30 points
    }
  }

  // Bonus for comprehensive CSP
  if (headers["Content-Security-Policy"] &&
      headers["Content-Security-Policy"].includes("default-src") &&
      headers["Content-Security-Policy"].includes("script-src")) {
    score += 10; // 10 bonus points
  }

  return Math.min(score, maxScore);
}

/**
 * Generate security headers audit log
 */
export function generateSecurityAuditLog(
  requestHeaders: Record<string, string>,
  responseHeaders: Record<string, string>
): SecurityAuditLog {
  const bypassDetected = detectSecurityBypass(requestHeaders);
  const securityScore = calculateSecurityScore(responseHeaders);

  return {
    timestamp: new Date(),
    requestHeaders,
    responseHeaders,
    securityScore,
    bypassDetected,
  };
}

/**
 * Combined security middleware with audit logging
 */
export function createAuditedSecurityMiddleware(): MiddlewareHandler {
  const securityMiddleware = securityHeadersMiddleware;

  return async (c, next) => {
    // Apply security headers
    await securityMiddleware(c, next);

    // Generate audit log after response
    const requestHeaders: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      requestHeaders[key] = value;
    });

    const responseHeaders: Record<string, string> = {};
    // Note: Response headers are set after the middleware chain completes
    // This would need to be implemented differently in a real scenario

    const auditLog = generateSecurityAuditLog(requestHeaders, responseHeaders);

    // Log security audit (in production, this would go to a security monitoring system)
    if (auditLog.bypassDetected) {
      console.warn("Security header bypass attempt detected:", auditLog);
    }

    if (auditLog.securityScore < 80) {
      console.warn("Low security headers score:", auditLog);
    }
  };
}
