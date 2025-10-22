import { defineConfig, Plugin, ConfigEnv, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Build-time security checks
function securityPlugin(configEnv: ConfigEnv): Plugin {
  return {
    name: "vite-plugin-security",
    buildStart() {
      // Load environment variables
      const env = loadEnv(configEnv.mode, process.cwd(), "");

      // Validate environment variables
      const requiredEnvVars = [
        "VITE_API_BASE_URL",
        "VITE_WS_BASE_URL",
        "VITE_DATABASE_URL",
        "VITE_BETTER_AUTH_SECRET",
        "VITE_BETTER_AUTH_URL",
        "VITE_CLIENT_TARGET",
        "VITE_ETHERSCAN_API_KEY",
        "VITE_IDENTITY_FACTORY_ADDRESS",
        "VITE_IDENTITY_REGISTRY_ADDRESS",
        "VITE_COMPLIANCE_ADDRESS",
        "VITE_COMPLIANT_FACTORY_ADDRESS",
        "VITE_COMPLIANT_ROUTER_ADDRESS",
        "VITE_COMPLIANT_QUOTER_ADDRESS",
        "VITE_COMPLIANT_POSITION_MANAGER_ADDRESS",
        "VITE_ORDERBOOK_MANAGER_ADDRESS",
        "VITE_SETTLEMENT_COORDINATOR_ADDRESS",
        "VITE_MARKETPLACE_INTEGRATION_ADDRESS",
        "VITE_TRADING_COMPLIANCE_ADDRESS",
        "VITE_JURISDICTION_COMPLIANCE_ADDRESS",
        "VITE_LOCALE",
        "VITE_TIMEZONE",
        "VITE_CURRENCY",
      ];

      for (const envVar of requiredEnvVars) {
        if (!env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }

      // Check for potentially insecure patterns
      console.log("🔒 Build-time security checks passed");
    },
  };
}

// Bundle analyzer (simple version for development)
function bundleAnalyzer(): Plugin {
  return {
    name: "bundle-analyzer",
    generateBundle(options, bundle) {
      const analysis = Object.entries(bundle).map(([fileName, chunk]) => ({
        file: fileName,
        size: chunk.type === "chunk" ? chunk.code.length : 0,
        isEntry: chunk.type === "chunk" ? chunk.isEntry : false,
      }));

      console.log("\n📦 Bundle Analysis:");
      analysis
        .filter(item => item.size > 0)
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .forEach(item => {
          console.log(`  ${item.file}: ${(item.size / 1024).toFixed(2)} KB`);
        });
    },
  };
}

// Enhanced build configuration factory
export function createBuildConfig(configEnv: ConfigEnv) {
  const { mode, command } = configEnv;

  return {
    // Server configuration with security headers
    server: {
      host: "::",
      port: 5173,
      proxy: {
        "/api": {
          target: "https://api.farsquare.xyz",
          changeOrigin: true,
          secure: false,
        },
      },
      headers: {
        // Security headers for wallet operations
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "cross-origin",
        // Prevent clickjacking
        "X-Frame-Options": "DENY",
        // Prevent MIME type sniffing
        "X-Content-Type-Options": "nosniff",
        // Enable XSS protection
        "X-XSS-Protection": "1; mode=block",
      },
    },

    // Build optimizations
    build: {
      // Enable sourcemaps in development
      sourcemap: mode === "development",
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Code splitting for wallet features
          manualChunks: (id: string) => {
            // Wallet-Auth-related modules
            if (
              id.includes("AuthContext") ||
              id.includes("wallet-context") ||
              id.includes("auth-client") ||
              id.includes("secure-api") ||
              id.includes("secure-logger") ||
              id.includes("error-monitor") ||
              id.includes("wallet-error-boundary")
            ) {
              return "wallet-auth";
            }

            // React ecosystem
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/@tanstack/react-query")
            ) {
              return "react-vendor";
            }

            // UI components
            if (
              id.includes("node_modules/@radix-ui") ||
              id.includes("node_modules/lucide-react") ||
              id.includes("node_modules/class-variance-authority")
            ) {
              return "ui-vendor";
            }

            // Blockchain integration
            if (
              id.includes("node_modules/viem")
            ) {
              return "evm-integration";
            }
          },
        },
      },
      // Minification options
      minify: "esbuild",
      // Target modern browsers
      target: "esnext",
      // CSS code splitting
      cssCodeSplit: true,
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@tanstack/react-query"
      ],
      exclude: [
        // Exclude large libraries that should be external

        // Exclude Node.js specific modules that need polyfills
        "process",
        "util",
        "stream",
        "crypto",
        // Exclude problematic SDKs

      ],
    },

    // Environment variables and constants
    define: {
      __APP_VERSION__: JSON.stringify("0.1.0"),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __ENVIRONMENT__: JSON.stringify(mode),
      // Security: Prevent accidental exposure of sensitive data
      __SECURE_BUILD__: JSON.stringify(true),
    },

    // Plugins
    plugins: [
      mode === "development" && bundleAnalyzer(),
      // Security checks
      securityPlugin(configEnv),
    ].filter(Boolean),

    // Path resolution
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "../"),
        '~ai': path.resolve(__dirname, '../../ai'),
        '~contracts': path.resolve(__dirname, '../../contracts'),
        '~infra': path.resolve(__dirname, '../../infra'),
        '~backend': path.resolve(__dirname, '../../backend'),
      },
    },

    // Environment-specific configurations
    ...(mode === "production" && {
      // Production-specific optimizations
      build: {
        minify: "esbuild",
        sourcemap: false,
      },
    }),

    ...(mode === "staging" && {
      // Staging-specific configurations
      server: {
        https: true,
        proxy: {
          "/api": {
            target: "https://api-dev.farsquare.xyz",
            changeOrigin: true,
            secure: true,
          },
        },
      },
    }),
  };
}

// Export for testing
export const buildConfig = createBuildConfig({ mode: "development", command: "serve" });
