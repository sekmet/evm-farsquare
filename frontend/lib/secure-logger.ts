// Secure logging utility for wallet operations
// Ensures no sensitive data (private keys, wallet addresses, etc.) is logged

interface SecureLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "wallet" | "api" | "ui" | "security";
  message: string;
  context?: Record<string, any>;
  errorId?: string;
  userId?: string; // Anonymized user identifier
}

class SecureLogger {
  private logLevel: SecureLogEntry["level"] = "info";
  private enableConsoleOutput = true;

  // Sensitive data patterns to redact
  private sensitivePatterns = [
    /0x[a-fA-F0-9]{40,}/g, // Ethereum/EVM addresses
    /[A-Z0-9]{26,}/g, // Private keys (base58)
    /-----BEGIN.*PRIVATE KEY-----[\s\S]*?-----END.*PRIVATE KEY-----/g, // PEM private keys
    /sk_[a-zA-Z0-9]{20,}/g, // API secret keys
  ];

  setLogLevel(level: SecureLogEntry["level"]) {
    this.logLevel = level;
  }

  setConsoleOutput(enabled: boolean) {
    this.enableConsoleOutput = enabled;
  }

  private redactSensitiveData(data: any): any {
    if (typeof data === "string") {
      let redacted = data;
      this.sensitivePatterns.forEach(pattern => {
        redacted = redacted.replace(pattern, "[REDACTED]");
      });
      return redacted;
    }

    if (typeof data === "object" && data !== null) {
      const redacted: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip known sensitive fields
        if (["privateKey", "secret", "password", "token", "apiKey", "walletAddress"].includes(key)) {
          redacted[key] = "[REDACTED]";
        } else {
          redacted[key] = this.redactSensitiveData(value);
        }
      }
      return redacted;
    }

    return data;
  }

  private shouldLog(level: SecureLogEntry["level"]): boolean {
    const levels = ["info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private createLogEntry(
    level: SecureLogEntry["level"],
    category: SecureLogEntry["category"],
    message: string,
    context?: Record<string, any>,
    errorId?: string
  ): SecureLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message: this.redactSensitiveData(message),
      context: context ? this.redactSensitiveData(context) : undefined,
      errorId,
    };
  }

  info(category: SecureLogEntry["category"], message: string, context?: Record<string, any>) {
    if (!this.shouldLog("info")) return;

    const entry = this.createLogEntry("info", category, message, context);

    if (this.enableConsoleOutput) {
      console.info(`[${entry.timestamp}] ${category.toUpperCase()}: ${entry.message}`, entry.context || "");
    }
  }

  warn(category: SecureLogEntry["category"], message: string, context?: Record<string, any>) {
    if (!this.shouldLog("warn")) return;

    const entry = this.createLogEntry("warn", category, message, context);

    if (this.enableConsoleOutput) {
      console.warn(`[${entry.timestamp}] ${category.toUpperCase()}: ${entry.message}`, entry.context || "");
    }
  }

  error(
    category: SecureLogEntry["category"],
    message: string,
    error?: Error,
    context?: Record<string, any>,
    errorId?: string
  ) {
    if (!this.shouldLog("error")) return;

    const entry = this.createLogEntry("error", category, message, {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack,
    }, errorId);

    if (this.enableConsoleOutput) {
      console.error(`[${entry.timestamp}] ${category.toUpperCase()}: ${entry.message}`, {
        errorId,
        context: entry.context,
      });
    }
  }

  // Specialized wallet logging methods
  logWalletOperation(operation: string, success: boolean, context?: Record<string, any>) {
    if (success) {
      this.info("wallet", `Wallet operation completed: ${operation}`, context);
    } else {
      this.error("wallet", `Wallet operation failed: ${operation}`, undefined, context);
    }
  }

  logApiCall(endpoint: string, method: string, success: boolean, duration?: number, errorId?: string) {
    const context = {
      endpoint,
      method,
      duration,
      success,
    };

    if (success) {
      this.info("api", `API call successful: ${method} ${endpoint}`, context);
    } else {
      this.error("api", `API call failed: ${method} ${endpoint}`, undefined, context, errorId);
    }
  }

  logSecurityEvent(event: string, context?: Record<string, any>) {
    this.warn("security", `Security event: ${event}`, context);
  }
}

// Singleton instance
export const secureLogger = new SecureLogger();

// Convenience functions for common logging patterns
export const logWalletOperation = secureLogger.logWalletOperation.bind(secureLogger);
export const logApiCall = secureLogger.logApiCall.bind(secureLogger);
export const logSecurityEvent = secureLogger.logSecurityEvent.bind(secureLogger);

// Export types
export type { SecureLogEntry };
