import { Hono } from "hono";
import { auth } from "@/lib/auth";

const authRoutes = new Hono();

// Custom SIWE logout endpoint
/*authRoutes.post("/api/auth/siwe/logout", async (c) => {
  try {
    // Clear the Better Auth session cookie
    c.header("Set-Cookie", "better-auth.session_token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/");

    // You can add additional SIWE-specific cleanup here if needed
    // For example, clear any SIWE-related session data

    return c.json({ success: true, message: "SIWE logout successful" });
  } catch (error) {
    console.error("SIWE logout error:", error);
    return c.json({ success: false, message: "SIWE logout failed" }, 500);
  }
});*/

// Mount Better Auth handler
authRoutes.on(["POST", "GET"], "/api/auth/*", async (c) => {
  return auth.handler(c.req.raw);
});

export { authRoutes };
