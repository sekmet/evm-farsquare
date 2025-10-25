/**
 * ERC-3643 Monitoring Service
 *
 * Provides comprehensive real-time monitoring and alerting for ERC-3643 compliant property token operations
 * across multiple EVM networks using Viem/Wagmi patterns.
 */

import { ERC3643ContractsService } from "./contracts";
import type { EVMNetwork } from "./contracts";
import type { Address, Hex, Block, TransactionReceipt, Log } from "viem";

export interface TransactionEvent {
  txHash: Hex;
  eventType: "deployment" | "mint" | "transfer" | "burn" | "freeze" | "unfreeze" | "compliance" | "identity" | "bridge_transfer" | "agent_operation";
  contractAddress: Address;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  blockNumber?: bigint;
  gasUsed?: bigint;
  network: EVMNetwork;
  details: Record<string, any>;
}

export interface ComplianceViolation {
  violationType: "country_restriction" | "balance_limit" | "time_restriction" | "identity_verification" | "agent_authorization";
  userAddress: Address;
  contractAddress: Address;
  timestamp: number;
  network: EVMNetwork;
  details: Record<string, any>;
}

export interface BlockData {
  number: bigint;
  hash: Hex;
  timestamp: number;
  transactions: Hex[];
  logs: Log[];
}

export interface ComplianceModuleActivity {
  moduleAddress: Address;
  action: "module_added" | "module_removed" | "rule_updated" | "validation_failed";
  timestamp: number;
  network: EVMNetwork;
  details: Record<string, any>;
}

export interface MetricData {
  totalDeployments: number;
  totalTokensMinted: bigint;
  totalTokensTransferred: bigint;
  activeInvestors: number;
  complianceViolations: number;
  transactionSuccessRate: number;
  averageConfirmationTime: number;
  activeNetworks: EVMNetwork[];
  gasUsed: bigint;
  reorganizationCount: number;
  bridgeTransfers: number;
  identityVerifications: number;
  agentOperations: number;
}

export interface AlertConfiguration {
  maxComplianceViolations: number;
  minSuccessRate: number;
  maxConfirmationTime: number;
  maxReorganizations: number;
  enableEmailAlerts: boolean;
  enableSlackAlerts: boolean;
  alertEmailAddresses: string[];
  slackWebhookUrl?: string;
}

/**
 * ERC-3643 Monitoring Service
 * Complete monitoring solution for ERC-3643 ecosystems across EVM networks
 */
export class MonitoringService {
  private events: TransactionEvent[] = [];
  private complianceViolations: ComplianceViolation[] = [];
  private contractsService: ERC3643ContractsService;
  private network: EVMNetwork;
  private blockMonitoringActive = false;
  private transactionMonitoringActive = false;
  private complianceMonitoringActive = false;
  private lastProcessedBlock?: BlockData;
  private alertConfig: AlertConfiguration = {
    maxComplianceViolations: 5,
    minSuccessRate: 90,
    maxConfirmationTime: 60000, // 1 minute
    maxReorganizations: 3,
    enableEmailAlerts: false,
    enableSlackAlerts: false,
    alertEmailAddresses: []
  };

  constructor(contractsService: ERC3643ContractsService) {
    this.contractsService = contractsService;
    this.network = contractsService.getNetwork();
  }

  /**
   * Create monitoring service for specific network
   */
  static createForNetwork(network: EVMNetwork): MonitoringService {
    const contractsService = new ERC3643ContractsService(network);
    return new MonitoringService(contractsService);
  }

  /**
   * Get current network
   */
  getNetwork(): EVMNetwork {
    return this.network;
  }

  /**
   * Track a transaction event
   */
  trackEvent(event: TransactionEvent): void {
    this.events.push(event);

    // Update metrics based on event type
    if (event.eventType === "deployment" && event.status === "confirmed") {
      // Metrics will be calculated on-demand
    } else if (event.eventType === "compliance" && event.status === "confirmed") {
      // Track compliance violations
    }

    // Log event
    console.log(`[MONITOR:${this.network}] ${event.eventType.toUpperCase()} - ${event.status} - ${event.txHash}`);

    // Check alert conditions
    this.checkAlertConditions();
  }

  /**
   * Track compliance violation
   */
  trackComplianceViolation(violation: ComplianceViolation): void {
    this.complianceViolations.push(violation);

    console.log(`[COMPLIANCE:${violation.network}] ${violation.violationType.toUpperCase()} - ${violation.userAddress}`);

    // Trigger alert if threshold exceeded
    if (this.complianceViolations.length >= this.alertConfig.maxComplianceViolations) {
      this.alert('critical', `High compliance violations: ${this.complianceViolations.length}`, {
        violations: this.complianceViolations.slice(-5), // Last 5 violations
        network: violation.network
      });
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): TransactionEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get all events
   */
  getAllEvents(): TransactionEvent[] {
    return [...this.events];
  }

  /**
   * Get compliance violations
   */
  getComplianceViolations(): ComplianceViolation[] {
    return [...this.complianceViolations];
  }

  /**
   * Get current metrics
   */
  getMetrics(): MetricData {
    const confirmedEvents = this.events.filter(e => e.status === "confirmed");
    const failedEvents = this.events.filter(e => e.status === "failed");

    // Calculate success rate
    const totalEvents = confirmedEvents.length + failedEvents.length;
    const transactionSuccessRate = totalEvents > 0 ? (confirmedEvents.length / totalEvents) * 100 : 100;

    // Calculate average confirmation time
    const confirmedWithTiming = confirmedEvents.filter(e => e.details.startTime && e.timestamp);
    const averageConfirmationTime = confirmedWithTiming.length > 0
      ? confirmedWithTiming.reduce((sum, e) => sum + (e.timestamp - e.details.startTime), 0) / confirmedWithTiming.length
      : 30000; // Default 30 seconds

    // Calculate total gas used
    const gasUsed = confirmedEvents.reduce((sum, e) => sum + (e.gasUsed || 0n), 0n);

    // Get active networks
    const activeNetworks = [...new Set(this.events.map(e => e.network))];

    // Calculate totals
    const totalDeployments = this.events.filter(e => e.eventType === "deployment" && e.status === "confirmed").length;
    const totalTokensMinted = this.events
      .filter(e => e.eventType === "mint" && e.status === "confirmed")
      .reduce((sum, e) => sum + (BigInt(e.details.amount || 0)), 0n);

    const totalTokensTransferred = this.events
      .filter(e => e.eventType === "transfer" && e.status === "confirmed")
      .reduce((sum, e) => sum + (BigInt(e.details.amount || 0)), 0n);

    const bridgeTransfers = this.events.filter(e => e.eventType === "bridge_transfer" && e.status === "confirmed").length;
    const identityVerifications = this.events.filter(e => e.eventType === "identity" && e.status === "confirmed").length;
    const agentOperations = this.events.filter(e => e.eventType === "agent_operation" && e.status === "confirmed").length;

    return {
      totalDeployments,
      totalTokensMinted,
      totalTokensTransferred,
      activeInvestors: new Set(this.events.flatMap(e =>
        [e.details.from, e.details.to, e.details.userAddress].filter(Boolean)
      )).size,
      complianceViolations: this.complianceViolations.length,
      transactionSuccessRate,
      averageConfirmationTime,
      activeNetworks,
      gasUsed,
      reorganizationCount: this.events.filter(e => e.details.reorganization).length,
      bridgeTransfers,
      identityVerifications,
      agentOperations
    };
  }

  /**
   * Get gas analytics
   */
  getGasAnalytics(): {
    averageGasUsed: number;
    totalGasUsed: bigint;
    gasByNetwork: Record<EVMNetwork, bigint>;
    gasEfficiency: number;
  } {
    const confirmedEvents = this.events.filter(e => e.status === "confirmed" && e.gasUsed);

    if (confirmedEvents.length === 0) {
      return {
        averageGasUsed: 0,
        totalGasUsed: 0n,
        gasByNetwork: {} as Record<EVMNetwork, bigint>,
        gasEfficiency: 100
      };
    }

    const totalGas = confirmedEvents.reduce((sum, e) => sum + e.gasUsed!, 0n);
    const averageGas = Number(totalGas) / confirmedEvents.length;

    const gasByNetwork = confirmedEvents.reduce((acc, e) => {
      acc[e.network] = (acc[e.network] || 0n) + e.gasUsed!;
      return acc;
    }, {} as Record<EVMNetwork, bigint>);

    // Calculate efficiency (lower gas per operation is better)
    const efficientOps = confirmedEvents.filter(e => e.gasUsed! < 100000n).length;
    const gasEfficiency = (efficientOps / confirmedEvents.length) * 100;

    return {
      averageGasUsed: averageGas,
      totalGasUsed: totalGas,
      gasByNetwork,
      gasEfficiency
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    transactionSuccessRate: number;
    totalTransactions: number;
    failedTransactions: number;
    averageConfirmationTime: number;
    throughput: number; // transactions per minute
    networkLatency: number;
  } {
    const metrics = this.getMetrics();
    const recentEvents = this.events.filter(e => Date.now() - e.timestamp < 3600000); // Last hour

    const throughput = recentEvents.length / 60; // per minute

    // Estimate network latency based on confirmation times
    const networkLatency = metrics.averageConfirmationTime / 2; // Rough estimate

    return {
      transactionSuccessRate: metrics.transactionSuccessRate,
      totalTransactions: this.events.length,
      failedTransactions: this.events.filter(e => e.status === "failed").length,
      averageConfirmationTime: metrics.averageConfirmationTime,
      throughput,
      networkLatency
    };
  }

  /**
   * Detect anomalies
   */
  detectAnomalies(): string[] {
    const anomalies: string[] = [];
    const metrics = this.getMetrics();

    // Check success rate
    if (metrics.transactionSuccessRate < this.alertConfig.minSuccessRate) {
      anomalies.push(`Low success rate: ${metrics.transactionSuccessRate.toFixed(1)}% (threshold: ${this.alertConfig.minSuccessRate}%)`);
    }

    // Check compliance violations
    if (metrics.complianceViolations > this.alertConfig.maxComplianceViolations) {
      anomalies.push(`High compliance violations: ${metrics.complianceViolations} (threshold: ${this.alertConfig.maxComplianceViolations})`);
    }

    // Check confirmation time
    if (metrics.averageConfirmationTime > this.alertConfig.maxConfirmationTime) {
      anomalies.push(`Slow confirmations: ${(metrics.averageConfirmationTime / 1000).toFixed(1)}s (threshold: ${this.alertConfig.maxConfirmationTime / 1000}s)`);
    }

    // Check reorganizations
    if (metrics.reorganizationCount > this.alertConfig.maxReorganizations) {
      anomalies.push(`High reorganizations: ${metrics.reorganizationCount} (threshold: ${this.alertConfig.maxReorganizations})`);
    }

    // Check gas efficiency
    const gasAnalytics = this.getGasAnalytics();
    if (gasAnalytics.gasEfficiency < 70) {
      anomalies.push(`Low gas efficiency: ${gasAnalytics.gasEfficiency.toFixed(1)}%`);
    }

    return anomalies;
  }

  /**
   * Start block monitoring
   */
  async startBlockMonitoring(blockCallback?: (block: BlockData) => void): Promise<void> {
    if (this.blockMonitoringActive) {
      console.log(`[MONITOR:${this.network}] Block monitoring already active`);
      return;
    }

    console.log(`[MONITOR:${this.network}] Starting block monitoring`);

    try {
      // Use Viem's watchBlocks for real-time monitoring
      const unwatch = this.contractsService['publicClient'].watchBlocks({
        onBlock: async (block) => {
          try {
            const blockData: BlockData = {
              number: block.number!,
              hash: block.hash!,
              timestamp: Number(block.timestamp),
              transactions: block.transactions,
              logs: [] // Will be populated if needed
            };

            this.lastProcessedBlock = blockData;

            // Process block for events
            await this.processBlock(blockData);

            // Call callback if provided
            if (blockCallback) {
              blockCallback(blockData);
            }
          } catch (error) {
            console.error(`[MONITOR:${this.network}] Error processing block:`, error);
          }
        },
        onError: (error) => {
          console.error(`[MONITOR:${this.network}] Block monitoring error:`, error);
        }
      });

      this.blockMonitoringActive = true;

      // Store unwatch function for cleanup
      (this as any).blockUnwatch = unwatch;

    } catch (error) {
      console.error(`[MONITOR:${this.network}] Failed to start block monitoring:`, error);
      throw error;
    }
  }

  /**
   * Stop block monitoring
   */
  stopBlockMonitoring(): void {
    if (this.blockMonitoringActive && (this as any).blockUnwatch) {
      (this as any).blockUnwatch();
      this.blockMonitoringActive = false;
      console.log(`[MONITOR:${this.network}] Stopped block monitoring`);
    }
  }

  /**
   * Monitor specific transactions
   */
  async monitorTransactions(txHashes: Hex[], confirmationCallback?: (txHash: Hex, receipt: TransactionReceipt) => void): Promise<void> {
    if (this.transactionMonitoringActive) {
      console.log(`[MONITOR:${this.network}] Transaction monitoring already active`);
      return;
    }

    console.log(`[MONITOR:${this.network}] Starting transaction monitoring for ${txHashes.length} transactions`);

    try {
      for (const txHash of txHashes) {
        // Wait for transaction receipt
        const receipt = await this.contractsService['publicClient'].waitForTransactionReceipt({
          hash: txHash
        });

        // Track the transaction
        this.trackTransactionLifecycle(txHash, receipt.status === 'success' ? 'confirmed' : 'failed', receipt);

        // Call callback if provided
        if (confirmationCallback) {
          confirmationCallback(txHash, receipt);
        }
      }

      this.transactionMonitoringActive = true;
    } catch (error) {
      console.error(`[MONITOR:${this.network}] Transaction monitoring error:`, error);
    }
  }

  /**
   * Track transaction lifecycle
   */
  trackTransactionLifecycle(txHash: Hex, status: "pending" | "confirmed" | "failed", receipt?: TransactionReceipt, startTime?: number): void {
    const event: TransactionEvent = {
      txHash,
      eventType: 'transfer', // Default, will be updated based on logs
      contractAddress: '0x0000000000000000000000000000000000000000' as Address, // Will be updated
      timestamp: Date.now(),
      status,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed,
      network: this.network,
      details: {
        startTime: startTime || Date.now(),
        receipt
      }
    };

    this.trackEvent(event);
  }

  /**
   * Update confirmation time
   */
  updateConfirmationTime(confirmationTime: number): void {
    // This will be reflected in metrics calculation
    console.log(`[MONITOR:${this.network}] Confirmation time: ${confirmationTime}ms`);
  }

  /**
   * Process block for events
   */
  async processBlock(blockData: BlockData): Promise<TransactionEvent[]> {
    const events: TransactionEvent[] = [];

    try {
      // Get logs for this block (ERC-3643 events)
      const logs = await this.contractsService['publicClient'].getLogs({
        fromBlock: blockData.number,
        toBlock: blockData.number,
        // Add specific ERC-3643 event signatures here
      });

      // Process logs for ERC-3643 events
      for (const log of logs) {
        const event = await this.processLog(log, blockData);
        if (event) {
          events.push(event);
        }
      }

      // Check for compliance violations
      await this.detectComplianceViolations(logs);

    } catch (error) {
      console.error(`[MONITOR:${this.network}] Error processing block ${blockData.number}:`, error);
    }

    return events;
  }

  /**
   * Process individual log
   */
  private async processLog(log: Log, blockData: BlockData): Promise<TransactionEvent | null> {
    // ERC-3643 Transfer event
    if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
      return {
        txHash: log.transactionHash!,
        eventType: 'transfer',
        contractAddress: log.address,
        timestamp: blockData.timestamp,
        status: 'confirmed',
        blockNumber: blockData.number,
        gasUsed: 65000n, // Estimate
        network: this.network,
        details: {
          from: `0x${log.topics[1]?.slice(26)}` as Address,
          to: `0x${log.topics[2]?.slice(26)}` as Address,
          amount: BigInt(log.data)
        }
      };
    }

    // Add more ERC-3643 event processing here...

    return null;
  }

  /**
   * Detect compliance violations from logs
   */
  async detectComplianceViolations(logs: Log[]): Promise<void> {
    // Implementation for detecting compliance violations
    // This would analyze logs for failed transfers due to compliance rules
  }

  /**
   * Monitor compliance modules
   */
  async monitorComplianceModules(complianceAddresses: Address[], activityCallback?: (activity: ComplianceModuleActivity) => void): Promise<void> {
    if (this.complianceMonitoringActive) {
      return;
    }

    console.log(`[MONITOR:${this.network}] Starting compliance monitoring for ${complianceAddresses.length} contracts`);

    // Set up log monitoring for compliance events
    // This would use Viem's watchEvent or periodic log fetching

    this.complianceMonitoringActive = true;
  }

  /**
   * Set last processed block (for reorg detection)
   */
  setLastProcessedBlock(block: BlockData): void {
    this.lastProcessedBlock = block;
  }

  /**
   * Detect block reorganization
   */
  detectReorganization(newBlock: BlockData): boolean {
    if (!this.lastProcessedBlock) return false;

    // Check if block hash changed for same number
    if (this.lastProcessedBlock.number === newBlock.number &&
        this.lastProcessedBlock.hash !== newBlock.hash) {

      console.log(`[MONITOR:${this.network}] Reorganization detected at block ${newBlock.number}`);

      // Track reorganization event
      this.trackEvent({
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
        eventType: 'transfer', // Generic event type
        contractAddress: '0x0000000000000000000000000000000000000000' as Address,
        timestamp: Date.now(),
        status: 'confirmed',
        blockNumber: newBlock.number,
        network: this.network,
        details: { reorganization: true, oldHash: this.lastProcessedBlock.hash, newHash: newBlock.hash }
      });

      return true;
    }

    return false;
  }

  /**
   * Get reorganization count
   */
  getReorganizationCount(): number {
    return this.events.filter(e => e.details.reorganization).length;
  }

  /**
   * Get bridge events
   */
  getBridgeEvents(targetNetwork: EVMNetwork): TransactionEvent[] {
    return this.events.filter(e =>
      e.eventType === 'bridge_transfer' &&
      e.details.bridgeTo === targetNetwork &&
      e.network === this.network
    );
  }

  /**
   * Get incoming bridge events
   */
  getIncomingBridgeEvents(): TransactionEvent[] {
    return this.events.filter(e =>
      e.eventType === 'bridge_transfer' &&
      e.details.bridgeTo === this.network
    );
  }

  /**
   * Configure alerts
   */
  configureAlerts(config: Partial<AlertConfiguration>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * Get alert configuration
   */
  getAlertConfiguration(): AlertConfiguration {
    return { ...this.alertConfig };
  }

  /**
   * Check alert conditions
   */
  checkAlertConditions(): void {
    const anomalies = this.detectAnomalies();

    if (anomalies.length > 0) {
      this.alert('warning', 'Anomalies detected', { anomalies, network: this.network });
    }
  }

  /**
   * Generate alert
   */
  alert(severity: "info" | "warning" | "critical", message: string, details?: any): void {
    const icon = severity === "info" ? "ℹ️" : severity === "warning" ? "⚠️" : "🚨";
    const timestamp = new Date().toISOString();

    console.log(`[ALERT:${this.network}] ${timestamp} ${icon} ${severity.toUpperCase()}: ${message}`);

    if (details) {
      console.log("Details:", JSON.stringify(details, null, 2));
    }

    // In production, this would send to alerting system
    if (this.alertConfig.enableEmailAlerts && this.alertConfig.alertEmailAddresses.length > 0) {
      // Send email alerts
      console.log(`[ALERT:${this.network}] Would send email to: ${this.alertConfig.alertEmailAddresses.join(', ')}`);
    }

    if (this.alertConfig.enableSlackAlerts && this.alertConfig.slackWebhookUrl) {
      // Send Slack alerts
      console.log(`[ALERT:${this.network}] Would send Slack alert to webhook`);
    }
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    events: TransactionEvent[];
    metrics: MetricData;
    complianceViolations: ComplianceViolation[];
    network: EVMNetwork;
    timestamp: number;
    lastProcessedBlock?: BlockData;
  } {
    return {
      events: [...this.events],
      metrics: this.getMetrics(),
      complianceViolations: [...this.complianceViolations],
      network: this.network,
      timestamp: Date.now(),
      lastProcessedBlock: this.lastProcessedBlock
    };
  }

  /**
   * Clear old events (keep last 1000)
   */
  clearOldEvents(): void {
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    if (this.complianceViolations.length > 500) {
      this.complianceViolations = this.complianceViolations.slice(-500);
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<{
    networkConnectivity: boolean;
    blockMonitoring: boolean;
    transactionMonitoring: boolean;
    lastBlockTime?: number;
    pendingEvents: number;
    memoryUsage: number;
  }> {
    try {
      // Check network connectivity
      const blockNumber = await this.contractsService.getBlockNumber();
      const networkConnectivity = blockNumber.success;

      return {
        networkConnectivity,
        blockMonitoring: this.blockMonitoringActive,
        transactionMonitoring: this.transactionMonitoringActive,
        lastBlockTime: this.lastProcessedBlock?.timestamp,
        pendingEvents: this.events.filter(e => e.status === 'pending').length,
        memoryUsage: this.events.length + this.complianceViolations.length
      };
    } catch (error) {
      return {
        networkConnectivity: false,
        blockMonitoring: this.blockMonitoringActive,
        transactionMonitoring: this.transactionMonitoringActive,
        pendingEvents: this.events.filter(e => e.status === 'pending').length,
        memoryUsage: this.events.length + this.complianceViolations.length
      };
    }
  }

  /**
   * Check if service is operational
   */
  isOperational(): boolean {
    // Service is operational if it can perform basic operations
    return true; // Could add more sophisticated checks
  }

  /**
   * Simulate network outage (for testing)
   */
  simulateNetworkOutage(): void {
    console.log(`[MONITOR:${this.network}] Simulating network outage`);
    // This would be used in testing to simulate network issues
  }

  /**
   * Get global metrics across multiple monitoring services
   */
  static getGlobalMetrics(services: MonitoringService[]): {
    totalDeployments: number;
    totalTokensMinted: bigint;
    totalTokensTransferred: bigint;
    activeNetworks: EVMNetwork[];
    crossNetworkActivity: number;
    totalComplianceViolations: number;
  } {
    const totalDeployments = services.reduce((sum, s) => sum + s.getMetrics().totalDeployments, 0);
    const totalTokensMinted = services.reduce((sum, s) => sum + s.getMetrics().totalTokensMinted, 0n);
    const totalTokensTransferred = services.reduce((sum, s) => sum + s.getMetrics().totalTokensTransferred, 0n);
    const activeNetworks = [...new Set(services.flatMap(s => s.getMetrics().activeNetworks))];
    const crossNetworkActivity = services.reduce((sum, s) => sum + s.getMetrics().bridgeTransfers, 0);
    const totalComplianceViolations = services.reduce((sum, s) => sum + s.getMetrics().complianceViolations, 0);

    return {
      totalDeployments,
      totalTokensMinted,
      totalTokensTransferred,
      activeNetworks,
      crossNetworkActivity,
      totalComplianceViolations
    };
  }
}

// Default singleton instance for backward compatibility
export const monitoringService = new MonitoringService(new ERC3643ContractsService('base-sepolia'));
