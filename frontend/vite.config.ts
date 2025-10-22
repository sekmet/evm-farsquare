import { defineConfig } from 'vite'
import path from 'path'
import { createBuildConfig } from "./lib/build-config";
import { ConfigEnv } from "vite";
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import csp from 'vite-plugin-csp-guard';

export default defineConfig((configEnv: ConfigEnv) => {
  const buildConfig = createBuildConfig(configEnv);

  return {
    ...buildConfig,
    plugins: [
      tailwindcss(),
      react(),
      csp({
        policy: {
          // Your other directives...
          'script-src': [
            "'self'", // Allows scripts from your own domain
            'https://static.cloudflareinsights.com', // Allows Cloudflare analytics script
          ],
        },
      }),
    ],
    mode: "development",
    server: {
      // Bind to all interfaces so the dev server is reachable externally (e.g., via reverse proxy/tunnel)
      host: true,
      // Permit access from the external domain and local dev hosts
      allowedHosts: [
        "hedera.farsquare.xyz",
        "static.cloudflareinsights.com",
        "localhost",
        "127.0.0.1",
        "::1",
      ],
    },
    build: {
      minify: false,
    }
  };

});
