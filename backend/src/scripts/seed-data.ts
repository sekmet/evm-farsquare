#!/usr/bin/env bun

/**
 * Seed Data Script for Farsquare EVM Platform
 *
 * Creates 21 properties with real estate data and images
 * Creates 21 users with various onboarding statuses
 * Populates the database for testing and demo purposes
 * Uses ERC-3643 compliant token contracts
 * Implements Viem/Wagmi patterns for EVM blockchain interactions
 *
 * Usage: bun run src/scripts/seed-data.ts
 */

import { Pool } from "pg";
import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains';

// Property seed data interface
export interface PropertySeedData {
  name: string;
  description: string;
  location: string;
  property_type: 'residential' | 'commercial' | 'industrial' | 'land';
  total_tokens: number;
  token_price: number;
  contract_address: string;
}

export interface UserSeedData {
  email: string;
  user_type: 'individual' | 'entity';
  user_jurisdiction: any;
  status: 'approved' | 'pending' | 'in_progress' | 'rejected';
  kyc_status: 'approved' | 'pending' | 'rejected';
  identity_verified: boolean;
}

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://evm_fsq_user:evm_fsq_password@localhost:5433/evm_fsq_db',
  max: 10,
});

// ============================================================================
// EVM CLIENT CONFIGURATION - Viem/Wagmi Patterns
// ============================================================================

// Create public client for read-only operations (ERC-3643 compliance)
const publicClient = createPublicClient({
  chain: anvil, // Using Anvil for local testing, can be changed to base for production
  transport: http(process.env.EVM_RPC_URL || 'http://localhost:8545'),
});

// Supported chains for multi-chain deployment
const supportedChains = [hardhat, anvil, sepolia, baseSepolia, optimismSepolia] as const;

// ============================================================================
// ERC-3643 CONTRACT INTERACTION FUNCTIONS - Viem/Wagmi Patterns
// ============================================================================

/**
 * Check if an ERC-3643 token contract is deployed and valid
 * Uses TREXToken.onchainID() and identityRegistry() methods
 */
async function validateERC3643Token(contractAddress: Address): Promise<boolean> {
  try {
    // ERC-3643 ABI for validation - parsed using parseAbi
    const erc3643Abi = parseAbi([
      'function onchainID() external view returns (address)',
      'function identityRegistry() external view returns (address)',
      'function compliance() external view returns (address)',
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function totalSupply() external view returns (uint256)'
    ]);

    // Check if contract responds to ERC-3643 methods
    const [onchainID, identityRegistry] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: erc3643Abi,
        functionName: 'onchainID'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: erc3643Abi,
        functionName: 'identityRegistry'
      })
    ]);

    // Validate that addresses are not zero
    return onchainID !== '0x0000000000000000000000000000000000000000' &&
           identityRegistry !== '0x0000000000000000000000000000000000000000';
  } catch (error) {
    console.error(`Failed to validate ERC-3643 token ${contractAddress}:`, error);
    return false;
  }
}

/**
 * Get ERC-3643 token information using contract read methods
 */
async function getERC3643TokenInfo(contractAddress: Address) {
  try {
    // ERC-3643 token information ABI - parsed using parseAbi
    const tokenInfoAbi = parseAbi([
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function totalSupply() external view returns (uint256)',
      'function decimals() external view returns (uint8)'
    ]);

    const [name, symbol, totalSupply, decimals] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'name'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'symbol'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'totalSupply'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'decimals'
      })
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
      totalSupply: (totalSupply as bigint).toString(),
      decimals: decimals as number,
      contractAddress
    };
  } catch (error) {
    console.error(`Failed to get token info for ${contractAddress}:`, error);
    return null;
  }
}

// Generate a random EVM address for testing
function generateRandomEVMAddress(): Address {
  return `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}` as Address;
}

// Generate a random string for testing
function generateRandomString(length: number = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  } 
  return result;
}


// Real property images from Unsplash (high-quality, free to use)
const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800", // Modern house
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", // Contemporary home
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", // Luxury villa
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800", // Urban apartment
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800", // Beach house
  "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800", // Mountain cabin
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800", // Modern architecture
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800", // Penthouse
  "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800", // Condo building
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800", // Townhouse
  "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800", // Estate home
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800", // Colonial house
  "https://images.unsplash.com/photo-1600563438938-a9a27216b4f5?w=800", // Ranch style
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", // Mediterranean
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800", // Contemporary loft
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800", // Suburban home
  "https://images.unsplash.com/photo-1600566752229-250ed79aa7d8?w=800", // Lake house
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800", // High-rise
  "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800", // Smart home
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800", // Duplex
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800", // Resort property
];

// Token symbol mapping function for EVM contracts
function getTokenSymbol(contractAddress: string): string {
  // For EVM addresses, use a mapping based on property type or generate from contract
  const symbolMap: Record<string, string> = {
    '0x33c0024ebC7A8989c1aE32988d5402295c8fd42B': 'FSQ',
    '0xF6F775DB26f2f54D9819CDE60B2E89b47DaF486F': 'FSQ-A',
    '0x013d4865Fbed666E055B6653CAb0FF3caF923992': 'FSQ-B',
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e': 'OFFSQ',
    '0x8ba1f109551bD432803012645AC136ddd64DBA72': 'THFSQ',
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266': 'MVFSQ',
    // Additional mappings for other contracts
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8': 'DLFSQ',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC': 'RVFSQ',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906': 'LSFSQ',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65': 'INFSQ',
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc': 'SFFSQ',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9': 'UGFSQ',
    '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955': 'ALFSQ',
    '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f': 'BHFSQ',
    '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720': 'SHFSQ',
    '0xBcd4042DE499D14e55001CcbB24a551F3b954096': 'RPFSQ',
    '0x71bE63f3384f5fb98995898A86B02Fb2426c5788': 'WMFSQ',
    '0xFABB0ac9d68B0B445fB7357272Ff202C5651694ce': 'DCFSQ',
    '0x1CBd3b466d2D4C1a61F4f0d8ECF5a0c1b1a7E550': 'BTFSQ',
    '0xdD2FD4581271e230360230F9337D5c0430Bf44C0': 'MOFSQ',
    '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199': 'GCFSQ',
  };

  return symbolMap[contractAddress] || 'TFSQ';
}

// Property data for 21 diverse real estate assets
const PROPERTIES: PropertySeedData[] = [
  {
    name: "Sunset Vista Luxury Apartments",
    description: "Modern luxury apartments with panoramic city views and state-of-the-art amenities",
    location: "Los Angeles, California",
    property_type: "residential",
    total_tokens: 1000000,
    token_price: 50,
    contract_address: "0x33c0024ebC7A8989c1aE32988d5402295c8fd42B",
  },
  {
    name: "Harbor Point Commercial Center",
    description: "Prime commercial space in downtown business district with high foot traffic",
    location: "Seattle, Washington",
    property_type: "commercial",
    total_tokens: 2500000,
    token_price: 100,
    contract_address: "0xF6F775DB26f2f54D9819CDE60B2E89b47DaF486F",
  },
  {
    name: "Green Valley Industrial Park",
    description: "Modern warehouse and logistics facility with excellent highway access",
    location: "Austin, Texas",
    property_type: "commercial",
    total_tokens: 1500000,
    token_price: 75,
    contract_address: "0x013d4865Fbed666E055B6653CAb0FF3caF923992",
  },
  {
    name: "Oceanfront Condominiums",
    description: "Beachfront luxury condos with direct ocean access and resort-style amenities",
    location: "Miami Beach, Florida",
    property_type: "residential",
    total_tokens: 3000000,
    token_price: 125,
    contract_address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  },
  {
    name: "Tech Hub Office Complex",
    description: "Class A office space in Silicon Valley tech corridor",
    location: "San Jose, California",
    property_type: "commercial",
    total_tokens: 5000000,
    token_price: 200,
    contract_address: "0x8ba1f109551bD432803012645AC136ddd64DBA72",
  },
  {
    name: "Mountain View Estates",
    description: "Exclusive gated community with mountain views and hiking trails",
    location: "Denver, Colorado",
    property_type: "residential",
    total_tokens: 2000000,
    token_price: 90,
    contract_address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Historic Downtown Lofts",
    description: "Converted warehouse lofts in trendy arts district",
    location: "Portland, Oregon",
    property_type: "residential",
    total_tokens: 800000,
    token_price: 60,
    contract_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
  {
    name: "Riverside Mixed-Use Development",
    description: "Modern mixed-use complex with retail, office, and residential spaces",
    location: "Chicago, Illinois",
    property_type: "commercial",
    total_tokens: 4000000,
    token_price: 150,
    contract_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  },
  {
    name: "Lakeside Resort Cabins",
    description: "Vacation rental cabins on pristine lake with full amenities",
    location: "Lake Tahoe, Nevada",
    property_type: "commercial",
    total_tokens: 1200000,
    token_price: 80,
    contract_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  },
  {
    name: "Innovation District Startup Hub",
    description: "Co-working and startup incubator space in innovation district",
    location: "Boston, Massachusetts",
    property_type: "commercial",
    total_tokens: 1800000,
    token_price: 95,
    contract_address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  },
  {
    name: "Solar Farm Energy Facility",
    description: "Large-scale solar energy facility with long-term power purchase agreements",
    location: "Phoenix, Arizona",
    property_type: "commercial",
    total_tokens: 6000000,
    token_price: 45,
    contract_address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  },
  {
    name: "Urban Garden Apartments",
    description: "Eco-friendly apartments with rooftop gardens and green spaces",
    location: "San Francisco, California",
    property_type: "residential",
    total_tokens: 2200000,
    token_price: 110,
    contract_address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  },
  {
    name: "Airport Logistics Center",
    description: "Strategic warehouse facility near major airport hub",
    location: "Atlanta, Georgia",
    property_type: "commercial",
    total_tokens: 3500000,
    token_price: 70,
    contract_address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  },
  {
    name: "Boutique Hotel Downtown",
    description: "Luxury boutique hotel in prime downtown location",
    location: "Nashville, Tennessee",
    property_type: "commercial",
    total_tokens: 2800000,
    token_price: 120,
    contract_address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  },
  {
    name: "Student Housing Complex",
    description: "Modern student apartments near major university campus",
    location: "Ann Arbor, Michigan",
    property_type: "residential",
    total_tokens: 1600000,
    token_price: 55,
    contract_address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
  },
  {
    name: "Retail Plaza Shopping Center",
    description: "High-traffic retail center with anchor tenants",
    location: "Dallas, Texas",
    property_type: "commercial",
    total_tokens: 3200000,
    token_price: 85,
    contract_address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
  },
  {
    name: "Waterfront Marina Residences",
    description: "Luxury waterfront living with private boat slips",
    location: "San Diego, California",
    property_type: "residential",
    total_tokens: 4500000,
    token_price: 180,
    contract_address: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
  },
  {
    name: "Data Center Facility",
    description: "Tier 3 data center with redundant power and cooling",
    location: "Ashburn, Virginia",
    property_type: "commercial",
    total_tokens: 7000000,
    token_price: 140,
    contract_address: "0xFABB0ac9d68B0B445fB7357272Ff202C5651694ce",
  },
  {
    name: "Historic Brownstone Collection",
    description: "Collection of renovated historic brownstone townhomes",
    location: "Brooklyn, New York",
    property_type: "residential",
    total_tokens: 5500000,
    token_price: 220,
    contract_address: "0x1CBd3b466d2D4C1a61F4f0d8ECF5a0c1b1a7E550",
  },
  {
    name: "Medical Office Building",
    description: "Modern medical office complex near hospital campus",
    location: "Houston, Texas",
    property_type: "commercial",
    total_tokens: 2700000,
    token_price: 105,
    contract_address: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
  },
  {
    name: "Golf Course Community Homes",
    description: "Luxury homes on PGA-certified golf course",
    location: "Scottsdale, Arizona",
    property_type: "residential",
    total_tokens: 8000000,
    token_price: 250,
    contract_address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  },
];

// User data for 21 test users with various statuses
const USERS = [
  { email: "alice.investor@example.com", user_type: "individual", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "bob.trader@example.com", user_type: "individual", user_jurisdiction: "US", status: "pending", kyc_status: "pending", identity_verified: false },
  { email: "carol.fund@example.com", user_type: "entity", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "david.buyer@example.com", user_type: "individual", user_jurisdiction: "US", status: "in_progress", kyc_status: "pending", identity_verified: false },
  { email: "emma.capital@example.com", user_type: "entity", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "frank.holdings@example.com", user_type: "entity", user_jurisdiction: "US", status: "pending", kyc_status: "pending", identity_verified: false },
  { email: "grace.ventures@example.com", user_type: "entity", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "henry.retail@example.com", user_type: "individual", user_jurisdiction: "US", status: "rejected", kyc_status: "rejected", identity_verified: false },
  { email: "iris.tech@example.com", user_type: "individual", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "jack.properties@example.com", user_type: "entity", user_jurisdiction: "US", status: "in_progress", kyc_status: "pending", identity_verified: false },
  { email: "karen.realty@example.com", user_type: "individual", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "leo.investments@example.com", user_type: "entity", user_jurisdiction: "US", status: "pending", kyc_status: "pending", identity_verified: false },
  { email: "maria.group@example.com", user_type: "entity", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "nathan.broker@example.com", user_type: "individual", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "olivia.wealth@example.com", user_type: "individual", user_jurisdiction: "US", status: "in_progress", kyc_status: "pending", identity_verified: false },
  { email: "paul.syndicate@example.com", user_type: "entity", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "quinn.equity@example.com", user_type: "individual", user_jurisdiction: "US", status: "pending", kyc_status: "pending", identity_verified: false },
  { email: "rachel.partners@example.com", user_type: "entity", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "steve.capital@example.com", user_type: "individual", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
  { email: "tina.fund@example.com", user_type: "entity", user_jurisdiction: "US", status: "in_progress", kyc_status: "pending", identity_verified: false },
  { email: "uma.trust@example.com", user_type: "entity", user_jurisdiction: "US", status: "approved", kyc_status: "approved", identity_verified: true },
];

async function seedDatabase() {
  console.log("🌱 Starting database seed for EVM ERC-3643 platform...\n");

  try {
    // Test database connection
    await pool.query("SELECT NOW()");
    console.log("✅ Database connection established\n");

    // Test EVM blockchain connection
    console.log("🔗 Testing EVM blockchain connection...");
    try {
      const blockNumber = await publicClient.getBlockNumber();
      console.log(`✅ Connected to EVM network (${publicClient.chain.name}), current block: ${blockNumber}`);
    } catch (error) {
      console.warn("⚠️  EVM network connection failed - continuing with database seeding only:", error);
    }
    console.log("");

    // Create schemas if they don't exist
    await pool.query(`CREATE SCHEMA IF NOT EXISTS public`);
    console.log("✅ Schemas verified\n");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await pool.query("TRUNCATE TABLE public.profiles CASCADE"); // This will cascade to onboarding_sessions
    await pool.query("TRUNCATE TABLE public.properties CASCADE");
    await pool.query("DELETE FROM public.property_images");
    console.log("✅ Existing data cleared\n");

    // Validate ERC-3643 token contracts (optional - continue if validation fails)
    console.log("🔍 Validating ERC-3643 token contracts...");
    for (const prop of PROPERTIES) {
      try {
        const isValid = await validateERC3643Token(prop.contract_address as Address);
        if (!isValid) {
          console.warn(`  ⚠️  Contract ${prop.contract_address} is not a valid ERC-3643 token (continuing anyway)`);
        } else {
          console.log(`  ✅ Validated ERC-3643 token: ${prop.contract_address}`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not validate contract ${prop.contract_address} (continuing anyway):`, error);
      }
    }
    console.log("");

    // Insert users
    console.log("👥 Inserting 21 users with EVM addresses...");

    // Insert properties
    console.log("🏠 Inserting 21 properties with ERC-3643 contracts...");
    for (let i = 0; i < PROPERTIES.length; i++) {
      const prop: PropertySeedData = PROPERTIES[i] as PropertySeedData;
      const imageUrl = PROPERTY_IMAGES[i];

      const user: UserSeedData = USERS[i] as UserSeedData;

      const user_id = generateRandomString();
      // Generate a unique EVM address for the property owner
      // Use the contract address as base and modify it slightly for uniqueness
      const ownerAddress = prop.contract_address;
      //generateRandomEVMAddress();

      const sessionId = `session-${Math.random().toString(36).substring(2, 15)}`;

      // Create user profile first (entity users need entity_name and entity_type)
      const isEntity = user.user_type === 'entity';
      const entityName = isEntity 
      ? user?.email?.split('@')[0].replace('.', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' LLC' 
      : user?.email?.split('@')[0].replace('.', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const entityType = isEntity ? 'llc' : null;
      
      const userResult = await pool.query(`
        INSERT INTO public.user (
        id, name, email, "emailVerified"
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
          user_id,
          entityName,
          user.email,
          false
      ]);

      const profileResult = await pool.query(`
        INSERT INTO public.profiles (
          user_id, evm_address, email, user_type, kyc_status, account_status, jurisdiction,
          entity_name, entity_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        user_id,
        ownerAddress,
        user.email,
        user.user_type,
        user.kyc_status,
        user.status === 'approved' ? 'active' : 'active', // account_status must be: active, suspended, or closed
        user.user_jurisdiction,
        entityName,
        entityType
      ]);

      const userId = profileResult.rows[0].id;

      // Then create onboarding session
      await pool.query(`
        INSERT INTO public.onboarding_sessions (
          session_id, user_id, email, user_type, jurisdiction, status, 
          kyc_status, identity_verified, current_step, progress
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        sessionId,
        user_id,
        //userId, // Now using UUID from profiles
        user.email,
        user.user_type,
        user.user_jurisdiction === 'entity' ? 'DE' : 'US',
        user.status,
        user.kyc_status,
        user.identity_verified,
        user.identity_verified ? 'complete' : 'kyc',
        user.identity_verified ? 100 : Math.floor(Math.random() * 80) + 20,
      ]);

      console.log(`  ✓ ${user.email} (${user.user_type}, ${user.status})`);


      const propertyResult = await pool.query(`
        INSERT INTO public.properties (
          contract_address, token_symbol, name, description, location, 
          property_type, total_tokens, available_tokens, token_price, 
          total_value, annual_yield, risk_level, minimum_investment, 
          images, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active')
         RETURNING id
      `, [
        prop.contract_address,
        getTokenSymbol(prop.contract_address) || 'TFSQ', // Extract standardized token symbol
        prop.name,
        prop.description,
        prop.location,
        prop.property_type,
        prop.total_tokens,
        prop.total_tokens, // available_tokens = total_tokens initially
        prop.token_price,
        prop.total_tokens * prop.token_price, // total_value = total_tokens * token_price
        5.5, // annual_yield - default 5.5%
        'medium', // risk_level - default medium
        prop.token_price * 10, // minimum_investment - 10 tokens minimum
        [imageUrl], // images array with single image,
        user_id,
      ]);

      console.log(`  ✓ ${prop.name} (${prop.property_type}) - ${prop.contract_address} - ${userId}`);

      const propertyId = propertyResult.rows[0].id;

      await pool.query(`
        INSERT INTO public.property_ownership (
          user_id, property_id, ownership_type, ownership_percentage
        ) VALUES ($1, $2, $3, $4)
      `, [
        user_id,
        propertyId,
        'owner',
        100
      ]);

    }

    console.log(`\n✅ ${USERS.length} users with EVM addresses inserted\n`);
    console.log(`\n✅ ${PROPERTIES.length} properties with ERC-3643 contracts inserted\n`);

    // Print summary
    const propCount = await pool.query("SELECT COUNT(*) FROM public.properties");
    const userCount = await pool.query("SELECT COUNT(*) FROM public.profiles");
    const sessionCount = await pool.query("SELECT COUNT(*) FROM public.onboarding_sessions");
    const imageCount = await pool.query("SELECT COUNT(*) FROM public.properties WHERE array_length(images, 1) > 0");

    console.log("📊 Database Seed Summary:");
    console.log(`   Properties: ${propCount.rows[0].count}`);
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Sessions: ${sessionCount.rows[0].count}`);
    console.log(`   Images: ${imageCount.rows[0].count}`);
    console.log("\n✨ EVM ERC-3643 seed completed successfully!\n");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed if called directly
if (import.meta.main) {
  seedDatabase()
    .then(() => {
      console.log("🎉 EVM ERC-3643 seed script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 EVM ERC-3643 seed script failed:", error);
      process.exit(1);
    });
}

export {
  seedDatabase,
  PROPERTIES,
  USERS,
  PROPERTY_IMAGES,
  validateERC3643Token,
  getERC3643TokenInfo,
  generateRandomEVMAddress,
  publicClient,
  supportedChains
};
