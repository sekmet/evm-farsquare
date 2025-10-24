/**
 * EVM Compliance Service
 *
 * Manages ERC-3643 modular compliance operations including modules and transfer checks
 * Uses Viem/Wagmi patterns for EVM blockchain interactions
 */

import type { Address, Hash, Hex } from 'viem'
import type { PublicClient, WalletClient } from 'viem'
import { encodeFunctionData, parseAbi } from 'viem'

/**
 * Compliance module information following ERC3643 patterns
 */
export interface ComplianceModule {
  address: Address
  name: string
  version: string
  isActive: boolean
}

/**
 * Transfer check result with detailed compliance information
 */
export interface TransferCheckResult {
  allowed: boolean
  reason?: string
  modules: Address[]
  failedModules?: Address[]
}

/**
 * Compliance module information response
 */
export interface ModuleInfo {
  name: string
  version: string
  description?: string
  moduleType: 'country' | 'balance' | 'time' | 'custom'
}

/**
 * Batch compliance check parameters
 */
export interface BatchTransferCheckParams {
  from: Address
  tos: Address[]
  amounts: bigint[]
}

/**
 * ERC-3643 Compliance Service
 * Manages modular compliance validation and transfer checks using Viem clients
 */
export class ComplianceService {
  private readonly complianceAbi = parseAbi([
    // Module management
    'function addModule(address _module) external',
    'function removeModule(address _module) external',
    'function activateModule(address _module) external',
    'function deactivateModule(address _module) external',

    // Module queries
    'function isModule(address _module) external view returns (bool)',
    'function isModuleActive(address _module) external view returns (bool)',
    'function getModules() external view returns (address[])',
    'function getActiveModules() external view returns (address[])',

    // Transfer validation
    'function canTransfer(address _from, address _to, uint256 _amount) external view returns (bool)',
    'function batchCanTransfer(address _from, address[] _tos, uint256[] _amounts) external view returns (bool[])',

    // Module information
    'function getModuleInfo(address _module) external view returns (string memory name, string memory version, string memory description)',
  ])

  private readonly complianceModuleAbi = parseAbi([
    // IComplianceModule interface
    'function moduleCheck(address _compliance) external view returns (bool)',
    'function canTransfer(address _from, address _to, uint256 _amount) external view returns (bool)',
    'function transferred(address _from, address _to, uint256 _amount) external',
    'function created(address _to, uint256 _amount) external',
    'function destroyed(address _from, uint256 _amount) external',
    'function bindToken(address _token) external',
  ])

  constructor(
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private complianceAddress: Address
  ) {}

  /**
   * Add compliance module following ERC3643 modular architecture
   */
  async addModule(
    moduleAddress: Address,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'addModule',
        args: [moduleAddress],
        account,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Add module failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Remove compliance module
   */
  async removeModule(
    moduleAddress: Address,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'removeModule',
        args: [moduleAddress],
        account,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Remove module failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Activate compliance module
   */
  async activateModule(
    moduleAddress: Address,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'activateModule',
        args: [moduleAddress],
        account,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Activate module failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Deactivate compliance module
   */
  async deactivateModule(
    moduleAddress: Address,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'deactivateModule',
        args: [moduleAddress],
        account,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Deactivate module failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Check if transfer is compliant following ERC3643 patterns
   */
  async canTransfer(
    from: Address,
    to: Address,
    amount: bigint
  ): Promise<TransferCheckResult> {
    try {
      const allowed = await this.publicClient.readContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'canTransfer',
        args: [from, to, amount],
      })

      if (allowed) {
        return { allowed: true, modules: [] }
      }

      // If not allowed, get active modules to identify which ones failed
      const activeModules = await this.getActiveModules()

      return {
        allowed: false,
        reason: 'Transfer violates compliance rules',
        modules: activeModules,
        failedModules: activeModules, // In real implementation, would check each module individually
      }
    } catch (error) {
      return {
        allowed: false,
        reason: `Compliance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modules: [],
      }
    }
  }

  /**
   * Batch compliance check for multiple transfers
   */
  async batchCanTransfer(
    params: BatchTransferCheckParams
  ): Promise<TransferCheckResult[]> {
    try {
      if (params.tos.length !== params.amounts.length) {
        throw new Error('Recipients and amounts arrays must have same length')
      }

      const results = await this.publicClient.readContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'batchCanTransfer',
        args: [params.from, params.tos, params.amounts],
      })

      const activeModules = await this.getActiveModules()

      return results.map((allowed: boolean, index: number) => ({
        allowed,
        reason: allowed ? undefined : 'Transfer violates compliance rules',
        modules: activeModules,
        failedModules: allowed ? undefined : activeModules,
      }))
    } catch (error) {
      const errorMessage = `Batch compliance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      return params.tos.map(() => ({
        allowed: false,
        reason: errorMessage,
        modules: [],
      }))
    }
  }

  /**
   * Get module information following ERC3643 patterns
   */
  async getModuleInfo(
    moduleAddress: Address
  ): Promise<{ success: boolean; data?: ModuleInfo; error?: string }> {
    try {
      const [name, version, description] = await this.publicClient.readContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'getModuleInfo',
        args: [moduleAddress],
      }) as [string, string, string]

      // Infer module type from name or address
      const moduleType = this.inferModuleType(name)

      return {
        success: true,
        data: {
          name,
          version,
          description,
          moduleType,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Get module info failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Check if module is active
   */
  async isModuleActive(
    moduleAddress: Address
  ): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
    try {
      const isActive = await this.publicClient.readContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'isModuleActive',
        args: [moduleAddress],
      })

      return { success: true, isActive: isActive as boolean }
    } catch (error) {
      return {
        success: false,
        error: `Check module active failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get all registered modules
   */
  async getModules(): Promise<{ success: boolean; modules?: Address[]; error?: string }> {
    try {
      const modules = await this.publicClient.readContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'getModules',
        args: [],
      })

      return { success: true, modules: modules as Address[] }
    } catch (error) {
      return {
        success: false,
        error: `Get modules failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get active compliance modules
   */
  async getActiveModules(): Promise<Address[]> {
    try {
      const activeModules = await this.publicClient.readContract({
        address: this.complianceAddress,
        abi: this.complianceAbi,
        functionName: 'getActiveModules',
        args: [],
      })

      return activeModules as Address[]
    } catch (error) {
      console.error('Failed to get active modules:', error)
      return []
    }
  }

  /**
   * Validate module compatibility before adding
   */
  async validateModule(moduleAddress: Address): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Check if module implements the required interface
      const isValid = await this.publicClient.readContract({
        address: moduleAddress,
        abi: this.complianceModuleAbi,
        functionName: 'moduleCheck',
        args: [this.complianceAddress],
      })

      if (!isValid) {
        return { valid: false, reason: 'Module check failed - incompatible module' }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        reason: `Module validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Bind token to compliance module
   */
  async bindTokenToModule(
    moduleAddress: Address,
    tokenAddress: Address,
    account: Address
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> {
    try {
      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: moduleAddress,
        abi: this.complianceModuleAbi,
        functionName: 'bindToken',
        args: [tokenAddress],
        account,
      })

      // Send transaction
      const hash = await this.walletClient.writeContract(request)

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        return { success: true, txHash: hash }
      } else {
        return { success: false, error: 'Transaction reverted' }
      }
    } catch (error) {
      return {
        success: false,
        error: `Bind token to module failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Infer module type from name
   */
  private inferModuleType(name: string): 'country' | 'balance' | 'time' | 'custom' {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('country')) return 'country'
    if (lowerName.includes('balance') || lowerName.includes('limit')) return 'balance'
    if (lowerName.includes('time') || lowerName.includes('vesting')) return 'time'
    return 'custom'
  }
}
