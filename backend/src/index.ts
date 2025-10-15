import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { auth } from "./lib/auth";
import { securityHeadersMiddleware, httpsEnforcementMiddleware } from "./lib/security-headers";

// Define context variables type
interface ContextVariables {
  user: any | null;
  session: any | null;
}

const app = new Hono<{ Variables: ContextVariables }>();

// CORS configuration for frontend integration
app.use(
  "/api/auth/*",
  cors({
    origin: [
      "http://localhost:5173", // Frontend dev server
      "https://evmfsq.farsquare.xyz", // Production domain
      ...(process.env.ALLOWED_ORIGINS?.split(',') || []), // Additional origins from env
    ],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

// HTTPS enforcement middleware (applied before other middleware)
app.use("/*", httpsEnforcementMiddleware);

// Additional security headers for all endpoints
app.use("/*", securityHeadersMiddleware);

// Additional security headers for auth endpoints (enhanced)
app.use("/api/auth/*", async (c, next) => {
  // Enhanced security for auth endpoints - additional checks can be added here
  await next();
});

// Mount auth routes
app.route("/", authRoutes);

// Session middleware (optional, for protected routes)
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

// Protected route example
app.get("/api/protected", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ message: "Protected data", user });
});

export default app;
