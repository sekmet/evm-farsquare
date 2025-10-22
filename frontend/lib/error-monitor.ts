import { secureLogger, logWalletOperation, logApiCall, logSecurityEvent } from "./secure-logger";
import { WalletError, WalletErrorType, createWalletError } from "./wallet-errors";

// Error monitoring and alerting system
interface ErrorAlert {
  id: string;
  level: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  context: Record<string, any>;
  timestamp: string;
  resolved: boolean;
}

class ErrorMonitor {
  private alerts: Map<string, ErrorAlert> = new Map();
  private alertThresholds = {
    [WalletErrorType.CONNECTION_FAILED]: "medium" as const,
    [WalletErrorType.TRANSACTION_FAILED]: "high" as const,
    [WalletErrorType.SIGNATURE_FAILED]: "high" as const,
    [WalletErrorType.BALANCE_FETCH_FAILED]: "low" as const,
    [WalletErrorType.NETWORK_ERROR]: "medium" as const,
    [WalletErrorType.TIMEOUT_ERROR]: "medium" as const,
    [WalletErrorType.UNKNOWN_ERROR]: "critical" as const,
  };

  private onAlertCallbacks: Array<(alert: ErrorAlert) => void> = [];

  /**
   * Monitor wallet errors and create alerts for critical issues
   */
  monitorWalletError(error: WalletError): void {
    // Log the error securely
    secureLogger.error("wallet", error.message, new Error(error.message), {
      errorType: error.type,
      errorId: error.errorId,
      context: error.details?.context,
      recoverable: error.recoverable,
    }, error.errorId);

    // Create alert for high-priority errors
    const alertLevel = this.alertThresholds[error.type] || "low";

    if (alertLevel === "high" || alertLevel === "critical") {
      const alert: ErrorAlert = {
        id: `alert_${error.errorId}`,
        level: alertLevel,
        title: `Wallet ${error.type.replace(/_/g, " ").toLowerCase()}`,
        message: error.userMessage,
        context: {
          errorType: error.type,
          errorId: error.errorId,
          recoverable: error.recoverable,
          context: error.details?.context,
        },
        timestamp: new Date().toISOString(),
        resolved: false,
      };

      this.alerts.set(alert.id, alert);

      // Notify subscribers
      this.onAlertCallbacks.forEach(callback => callback(alert));

      // Log security event for critical errors
      if (alertLevel === "critical") {
        logSecurityEvent("Critical wallet error detected", {
          errorId: error.errorId,
          errorType: error.type,
        });
      }
    }
  }

  /**
   * Monitor API calls and performance
   */
  monitorApiCall(
    endpoint: string,
    method: string,
    success: boolean,
    duration: number,
    errorId?: string
  ): void {
    logApiCall(endpoint, method, success, duration, errorId);

    // Alert on API failures
    if (!success) {
      const alert: ErrorAlert = {
        id: `api_alert_${Date.now()}`,
        level: "medium",
        title: "API Call Failed",
        message: `Failed to call ${method} ${endpoint}`,
        context: {
          endpoint,
          method,
          duration,
          errorId,
        },
        timestamp: new Date().toISOString(),
        resolved: false,
      };

      this.alerts.set(alert.id, alert);
      this.onAlertCallbacks.forEach(callback => callback(alert));
    }

    // Monitor performance - alert on slow responses
    if (duration > 5000) { // 5 seconds
      secureLogger.warn("api", `Slow API response: ${method} ${endpoint}`, {
        duration,
        endpoint,
        method,
      });
    }
  }

  /**
   * Subscribe to alert notifications
   */
  onAlert(callback: (alert: ErrorAlert) => void): () => void {
    this.onAlertCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.onAlertCallbacks.indexOf(callback);
      if (index > -1) {
        this.onAlertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      secureLogger.info("security", `Alert resolved: ${alert.title}`, { alertId });
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): ErrorAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alerts by level
   */
  getAlertsByLevel(level: ErrorAlert["level"]): ErrorAlert[] {
    return this.getActiveAlerts().filter(alert => alert.level === level);
  }

  /**
   * Clear resolved alerts (cleanup)
   */
  clearResolvedAlerts(): void {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved) {
        this.alerts.delete(id);
      }
    }
  }
}

// Singleton instance
export const errorMonitor = new ErrorMonitor();

// Enhanced error handler that integrates monitoring
export function handleWalletErrorWithMonitoring(error: WalletError): WalletError {
  // Monitor the error
  errorMonitor.monitorWalletError(error);

  // Log wallet operation failure
  logWalletOperation(error.type, false, {
    errorId: error.errorId,
    recoverable: error.recoverable,
  });

  return error;
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, { startTime: number; metadata?: any }> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasurement(key: string, metadata?: any): void {
    this.measurements.set(key, {
      startTime: performance.now(),
      metadata,
    });
  }

  endMeasurement(key: string): number | null {
    const measurement = this.measurements.get(key);
    if (!measurement) return null;

    const duration = performance.now() - measurement.startTime;
    this.measurements.delete(key);

    // Log performance metrics
    secureLogger.info("api", `Performance measurement: ${key}`, {
      duration: Math.round(duration),
      metadata: measurement.metadata,
    });

    return duration;
  }

  // Measure async operations
  async measureAsync<T>(
    key: string,
    operation: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    this.startMeasurement(key, metadata);
    try {
      const result = await operation();
      const duration = this.endMeasurement(key);

      // Monitor API performance
      if (key.startsWith("api:")) {
        const [, endpoint] = key.split(":", 2);
        errorMonitor.monitorApiCall(endpoint, "GET", true, duration || 0);
      }

      return result;
    } catch (error) {
      const duration = this.endMeasurement(key);

      // Monitor failed API calls
      if (key.startsWith("api:")) {
        const [, endpoint] = key.split(":", 2);
        const method = metadata?.method || "GET";
        errorMonitor.monitorApiCall(endpoint, method, false, duration || 0);
      }

      throw error;
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Export types
export type { ErrorAlert };
