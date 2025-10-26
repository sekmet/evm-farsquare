/**
 * ERC-3643 Contract Bytecode Registry
 * Extracted from Hardhat compilation artifacts
 */

import type { Hex } from 'viem';

// Import artifacts
import ImplementationAuthorityArtifact from '../../../artifacts/contracts/erc3643/factory/ImplementationAuthority.sol/ImplementationAuthority.json';
import IdentityRegistryStorageArtifact from '../../../artifacts/contracts/erc3643/storage/IdentityRegistryStorage.sol/IdentityRegistryStorage.json';
import IdentityFactoryArtifact from '../../../artifacts/contracts/erc3643/factory/IdentityFactory.sol/IdentityFactory.json';
import ClaimTopicsRegistryArtifact from '../../../artifacts/contracts/erc3643/registries/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json';
import TrustedIssuersRegistryArtifact from '../../../artifacts/contracts/erc3643/registries/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json';
import IdentityRegistryArtifact from '../../../artifacts/contracts/erc3643/registry/IdentityRegistry.sol/IdentityRegistry.json';
import ModularComplianceArtifact from '../../../artifacts/contracts/erc3643/compliance/ModularCompliance.sol/ModularCompliance.json';
import TimeRestrictionsModuleArtifact from '../../../artifacts/contracts/erc3643/compliance/modules/TimeRestrictionsModule.sol/TimeRestrictionsModule.json';
import CountryRestrictionsModuleArtifact from '../../../artifacts/contracts/erc3643/compliance/modules/CountryRestrictionsModule.sol/CountryRestrictionsModule.json';
import MaxBalanceModuleArtifact from '../../../artifacts/contracts/erc3643/compliance/modules/MaxBalanceModule.sol/MaxBalanceModule.json';
import MaxHoldersModuleArtifact from '../../../artifacts/contracts/erc3643/compliance/modules/MaxHoldersModule.sol/MaxHoldersModule.json';
import TREXTokenArtifact from '../../../artifacts/contracts/erc3643/token/TREXToken.sol/TREXToken.json';
import OnchainIDArtifact from '../../../artifacts/contracts/erc3643/identity/OnchainID.sol/OnchainID.json';

/**
 * Contract Bytecode Registry
 * Maps contract names to their deployment bytecode
 */
export const CONTRACT_BYTECODE: Record<string, Hex> = {
  ImplementationAuthority: ImplementationAuthorityArtifact.bytecode as Hex,
  IdentityRegistryStorage: IdentityRegistryStorageArtifact.bytecode as Hex,
  IdentityFactory: IdentityFactoryArtifact.bytecode as Hex,
  ClaimTopicsRegistry: ClaimTopicsRegistryArtifact.bytecode as Hex,
  TrustedIssuersRegistry: TrustedIssuersRegistryArtifact.bytecode as Hex,
  IdentityRegistry: IdentityRegistryArtifact.bytecode as Hex,
  ModularCompliance: ModularComplianceArtifact.bytecode as Hex,
  TimeRestrictionsModule: TimeRestrictionsModuleArtifact.bytecode as Hex,
  CountryRestrictionsModule: CountryRestrictionsModuleArtifact.bytecode as Hex,
  MaxBalanceModule: MaxBalanceModuleArtifact.bytecode as Hex,
  MaxHoldersModule: MaxHoldersModuleArtifact.bytecode as Hex,
  TREXToken: TREXTokenArtifact.bytecode as Hex,
  OnchainID: OnchainIDArtifact.bytecode as Hex,
};

/**
 * Contract ABI Registry
 * Maps contract names to their ABIs
 */
export const CONTRACT_ABI: Record<string, readonly any[]> = {
  ImplementationAuthority: ImplementationAuthorityArtifact.abi,
  IdentityRegistryStorage: IdentityRegistryStorageArtifact.abi,
  IdentityFactory: IdentityFactoryArtifact.abi,
  ClaimTopicsRegistry: ClaimTopicsRegistryArtifact.abi,
  TrustedIssuersRegistry: TrustedIssuersRegistryArtifact.abi,
  IdentityRegistry: IdentityRegistryArtifact.abi,
  ModularCompliance: ModularComplianceArtifact.abi,
  TimeRestrictionsModule: TimeRestrictionsModuleArtifact.abi,
  CountryRestrictionsModule: CountryRestrictionsModuleArtifact.abi,
  MaxBalanceModule: MaxBalanceModuleArtifact.abi,
  MaxHoldersModule: MaxHoldersModuleArtifact.abi,
  TREXToken: TREXTokenArtifact.abi,
  OnchainID: OnchainIDArtifact.abi,
};

/**
 * Get contract bytecode by name
 */
export function getContractBytecode(contractName: string): Hex {
  const bytecode = CONTRACT_BYTECODE[contractName];
  if (!bytecode) {
    throw new Error(`Bytecode not found for contract: ${contractName}`);
  }
  return bytecode;
}

/**
 * Get contract ABI by name
 */
export function getContractABI(contractName: string): readonly any[] {
  const abi = CONTRACT_ABI[contractName];
  if (!abi) {
    throw new Error(`ABI not found for contract: ${contractName}`);
  }
  return abi;
}

/**
 * Validate all bytecode is available
 */
export function validateBytecode(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const [name, bytecode] of Object.entries(CONTRACT_BYTECODE)) {
    if (!bytecode || bytecode === '0x') {
      missing.push(name);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
