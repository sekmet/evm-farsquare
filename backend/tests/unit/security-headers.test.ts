import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { Hono } from "hono";

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("Security Headers Implementation", () => {
  test("should set X-Content-Type-Options header", async () => {
    const app = new Hono();

    // Import and apply security headers middleware
    const { securityHeadersMiddleware } = await import("@/lib/security-headers");
    app.use("/api/auth/*", securityHeadersMiddleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  test("should set X-Frame-Options header", async () => {
    const app = new Hono();

    const { securityHeadersMiddleware } = await import("@/lib/security-headers");
    app.use("/api/auth/*", securityHeadersMiddleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  test("should set Content Security Policy header", async () => {
    const app = new Hono();

    const { securityHeadersMiddleware } = await import("@/lib/security-headers");
    app.use("/api/auth/*", securityHeadersMiddleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  test("should set HTTPS Strict Transport Security in production", async () => {
    // Set environment before importing to ensure middleware is created correctly
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const app = new Hono();

    const { createSecurityHeadersMiddleware } = await import("@/lib/security-headers");

    // Create fresh middleware instance with current environment
    const middleware = createSecurityHeadersMiddleware();
    app.use("/api/auth/*", middleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    expect(res.headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains; preload");

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  test("should not set HSTS in development", async () => {
    process.env.NODE_ENV = "development";

    const app = new Hono();

    const { securityHeadersMiddleware } = await import("@/lib/security-headers");
    app.use("/api/auth/*", securityHeadersMiddleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    expect(res.headers.get("Strict-Transport-Security")).toBeNull();
  });

  test("should set X-XSS-Protection header", async () => {
    const app = new Hono();

    const { securityHeadersMiddleware } = await import("@/lib/security-headers");
    app.use("/api/auth/*", securityHeadersMiddleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
  });

  test("should set Referrer-Policy header", async () => {
    const app = new Hono();

    const { securityHeadersMiddleware } = await import("@/lib/security-headers");
    app.use("/api/auth/*", securityHeadersMiddleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  test("should set Permissions-Policy header", async () => {
    const app = new Hono();

    const { securityHeadersMiddleware } = await import("@/lib/security-headers");
    app.use("/api/auth/*", securityHeadersMiddleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    expect(res.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  test("should not apply security headers to non-auth routes", async () => {
    const app = new Hono();

    const { securityHeadersMiddleware } = await import("@/lib/security-headers");
    app.use("/api/auth/*", securityHeadersMiddleware);

    app.get("/api/public", (c) => c.text("OK"));

    const res = await app.request("/api/public");
    expect(res.headers.get("X-Content-Type-Options")).toBeNull();
    expect(res.headers.get("X-Frame-Options")).toBeNull();
  });

  test("should validate security headers configuration", async () => {
    const { validateSecurityHeaders } = await import("@/lib/security-headers");

    const config = {
      contentSecurityPolicy: "default-src 'self'",
      xFrameOptions: "DENY",
      xContentTypeOptions: "nosniff",
      hsts: "max-age=31536000; includeSubDomains",
    };

    const isValid = validateSecurityHeaders(config);
    expect(isValid).toBe(true);
  });

  test("should detect invalid Content Security Policy", async () => {
    const { validateSecurityHeaders } = await import("@/lib/security-headers");

    const config = {
      contentSecurityPolicy: "", // Invalid empty CSP
      xFrameOptions: "DENY",
      xContentTypeOptions: "nosniff",
    };

    const isValid = validateSecurityHeaders(config);
    expect(isValid).toBe(false);
  });

  test("should detect invalid X-Frame-Options", async () => {
    const { validateSecurityHeaders } = await import("@/lib/security-headers");

    const config = {
      contentSecurityPolicy: "default-src 'self'",
      xFrameOptions: "INVALID", // Invalid value
      xContentTypeOptions: "nosniff",
    };

    const isValid = validateSecurityHeaders(config);
    expect(isValid).toBe(false);
  });

  test("should generate secure CSP for authentication endpoints", async () => {
    const { generateSecureCSP } = await import("@/lib/security-headers");

    const csp = generateSecureCSP();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  test("should handle HTTPS redirection for non-secure requests", async () => {
    process.env.NODE_ENV = "production";

    const app = new Hono();

    const { httpsEnforcementMiddleware } = await import("@/lib/security-headers");
    app.use("/*", httpsEnforcementMiddleware);

    app.get("/test", (c) => c.text("OK"));

    const res = await app.request("http://localhost/test", {
      headers: { "X-Forwarded-Proto": "http", "Host": "localhost" }
    });

    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toContain("https://");
  });

  test("should not redirect HTTPS requests", async () => {
    process.env.NODE_ENV = "production";

    const app = new Hono();

    const { httpsEnforcementMiddleware } = await import("@/lib/security-headers");
    app.use("/*", httpsEnforcementMiddleware);

    app.get("/test", (c) => c.text("OK"));

    const res = await app.request("http://localhost/test", {
      headers: { "X-Forwarded-Proto": "https" }
    });

    expect(res.status).toBe(200);
  });

  test("should create comprehensive security headers configuration", async () => {
    const { createSecurityHeadersConfig } = await import("@/lib/security-headers");

    const config = createSecurityHeadersConfig();

    expect(config).toHaveProperty("contentSecurityPolicy");
    expect(config).toHaveProperty("xFrameOptions");
    expect(config).toHaveProperty("xContentTypeOptions");
    expect(config).toHaveProperty("xssProtection");
    expect(config).toHaveProperty("referrerPolicy");
    expect(config).toHaveProperty("permissionsPolicy");
    expect(config).toHaveProperty("hsts");
  });

  test("should export all security headers utilities", async () => {
    const securityHeaders = await import("@/lib/security-headers");

    expect(securityHeaders).toHaveProperty("securityHeadersMiddleware");
    expect(securityHeaders).toHaveProperty("httpsEnforcementMiddleware");
    expect(securityHeaders).toHaveProperty("validateSecurityHeaders");
    expect(securityHeaders).toHaveProperty("generateSecureCSP");
    expect(securityHeaders).toHaveProperty("createSecurityHeadersConfig");
  });

  test("should handle security headers with custom configuration", async () => {
    const app = new Hono();

    const { createSecurityHeadersMiddleware } = await import("@/lib/security-headers");

    const customConfig = {
      contentSecurityPolicy: "default-src 'self' https://trusted.com",
      xFrameOptions: "SAMEORIGIN",
    };

    const middleware = createSecurityHeadersMiddleware(customConfig);
    app.use("/api/auth/*", middleware);

    app.get("/api/auth/test", (c) => c.text("OK"));

    const res = await app.request("/api/auth/test");
    expect(res.headers.get("Content-Security-Policy")).toBe("default-src 'self' https://trusted.com");
    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  test("should detect security header bypass attempts", async () => {
    const { detectSecurityBypass } = await import("@/lib/security-headers");

    const suspiciousHeaders = {
      "X-Forwarded-Host": "evil.com\nmalicious.com", // Contains newline for injection
      "X-Original-URL": "/admin",
      "X-Rewrite-URL": "/admin",
    };

    const isBypassAttempt = detectSecurityBypass(suspiciousHeaders);
    expect(isBypassAttempt).toBe(true);
  });

  test("should allow legitimate headers", async () => {
    const { detectSecurityBypass } = await import("@/lib/security-headers");

    const legitimateHeaders = {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
      "Authorization": "Bearer token123",
    };

    const isBypassAttempt = detectSecurityBypass(legitimateHeaders);
    expect(isBypassAttempt).toBe(false);
  });

  test("should generate security headers audit log", async () => {
    const { generateSecurityAuditLog } = await import("@/lib/security-headers");

    const requestHeaders = { "User-Agent": "TestAgent", "X-Forwarded-For": "127.0.0.1" };
    const responseHeaders = { "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'self'" };

    const auditLog = generateSecurityAuditLog(requestHeaders, responseHeaders);

    expect(auditLog).toHaveProperty("timestamp");
    expect(auditLog).toHaveProperty("requestHeaders");
    expect(auditLog).toHaveProperty("responseHeaders");
    expect(auditLog).toHaveProperty("securityScore");
  });

  test("should calculate security headers compliance score", async () => {
    const { calculateSecurityScore } = await import("@/lib/security-headers");

    const headers = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'self'",
      "Strict-Transport-Security": "max-age=31536000",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    const score = calculateSecurityScore(headers);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
