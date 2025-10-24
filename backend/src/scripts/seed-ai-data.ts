#!/usr/bin/env bun

/**
 * AI Insights Seed Data Script for Farsquare EVM Platform
 *
 * Seeds AI insights data based on ERC-3643 compliant token ecosystem
 * Populates the insights schema tables with demo data for testing
 * Uses Viem/Wagmi patterns for EVM blockchain interactions
 *
 * Usage: bun run src/scripts/seed-ai-data.ts
 */

import { Pool } from "pg";
import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains';

// ============================================================================
// AI INSIGHTS SEED DATA INTERFACES
// ============================================================================

export interface AIInsightSeedData {
  insight_type: 'market' | 'risk' | 'opportunity' | 'portfolio';
  title: string;
  description: string;
  confidence_score: number; // 0-1 scale
  impact: 'positive' | 'negative' | 'neutral';
  category: 'market' | 'risk' | 'opportunity' | 'portfolio';
  model_version: string;
  expires_at?: string; // ISO date string
  metadata?: Record<string, any>;
}

export interface PropertyRecommendationSeedData {
  property_id: string; // Will be looked up from properties table
  user_id: string; // Will be looked up from users table
  score: number; // 0-1 scale
  reason: string;
  expected_roi: number; // percentage
  risk_level: 'Low' | 'Medium' | 'High' | 'low' | 'medium' | 'high'; // Support both capital and lowercase
  investment_amount: number; // USD
  time_horizon: string;
  expected_returns: number; // USD
  risk_factors: string[];
  opportunities: string[];
  model_version: string;
  expires_at?: string; // ISO date string
}

// Type for the actual seed data structure (without property_id and user_id)
export type PropertyRecommendationSeedInput = Omit<PropertyRecommendationSeedData, 'property_id' | 'user_id'>;

export interface MarketAnalyticsSeedData {
  timeframe: '1W' | '1M' | '3M' | '1Y';
  market_cap: number; // USD
  total_properties: number;
  avg_yield: number; // percentage
  market_trend: 'bullish' | 'bearish' | 'neutral';
  volatility_index: number;
  investor_sentiment: number; // 0-100 scale
}

export interface PortfolioAnalyticsSeedData {
  user_id: string; // Will be looked up from users table
  diversification_score: number; // 0-100 scale
  risk_exposure: 'low' | 'medium' | 'high'; // Matches database enum
  expected_returns: number; // percentage
  recommendations: Array<{
    type: 'diversify' | 'rebalance' | 'increase' | 'decrease';
    description: string;
    impact: string;
  }>;
  model_version: string;
}

// Type for the actual portfolio analytics seed data structure (without user_id)
export type PortfolioAnalyticsSeedInput = Omit<PortfolioAnalyticsSeedData, 'user_id'>;

// ============================================================================
// EVM CLIENT CONFIGURATION - Viem/Wagmi Patterns
// ============================================================================

// Create public client for read-only operations (ERC-3643 compliance)
const publicClient = createPublicClient({
  chain: anvil, // Using Base network for ERC-3643 deployment
  transport: http(process.env.EVM_RPC_URL || 'https://mainnet.base.org'),
});

// Supported chains for multi-chain deployment
const supportedChains = [hardhat, anvil, sepolia, baseSepolia, optimismSepolia] as const;

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://evm_fsq_user:evm_fsq_password@localhost:5433/evm_fsq_db',
  max: 10,
});

// ============================================================================
// AI INSIGHTS SEED DATA
// ============================================================================

const AI_INSIGHTS: AIInsightSeedData[] = [
  {
    insight_type: 'market',
    title: 'Market Growth Trend',
    description: 'Urban residential properties showing sustained 8.2% growth trend over the past quarter',
    confidence_score: 0.87,
    impact: 'positive',
    category: 'market',
    model_version: 'v1.0.0',
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    metadata: {
      growth_rate: 0.082,
      timeframe: 'quarterly',
      data_points: 90,
      market_segment: 'urban_residential'
    }
  },
  {
    insight_type: 'risk',
    title: 'Risk Assessment Update',
    description: 'Office space vacancy rates stabilizing in major metropolitan areas',
    confidence_score: 0.74,
    impact: 'neutral',
    category: 'risk',
    model_version: 'v1.0.0',
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    metadata: {
      vacancy_rate_change: -0.02,
      affected_markets: ['NYC', 'LA', 'Chicago', 'SF'],
      trend_direction: 'stabilizing'
    }
  },
  {
    insight_type: 'portfolio',
    title: 'Portfolio Health Check',
    description: 'Current portfolio diversification score: 78/100 - Consider geographic expansion',
    confidence_score: 0.91,
    impact: 'neutral',
    category: 'portfolio',
    model_version: 'v1.0.0',
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    metadata: {
      diversification_score: 78,
      recommended_actions: ['geographic_expansion', 'sector_diversification'],
      risk_assessment: 'moderate'
    }
  },
  {
    insight_type: 'opportunity',
    title: 'Investment Opportunity',
    description: 'Miami residential market undervalued by 12% based on rental yield fundamentals',
    confidence_score: 0.82,
    impact: 'positive',
    category: 'opportunity',
    model_version: 'v1.0.0',
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    metadata: {
      undervaluation_percentage: 0.12,
      market: 'Miami',
      property_type: 'residential',
      opportunity_score: 0.85
    }
  }
];

// ============================================================================
// MARKET ANALYTICS SEED DATA
// ============================================================================

const MARKET_ANALYTICS: MarketAnalyticsSeedData[] = [
  {
    timeframe: '1M',
    market_cap: 428000000, // $428M
    total_properties: 2847,
    avg_yield: 8.2,
    market_trend: 'bullish',
    volatility_index: 23.5,
    investor_sentiment: 76
  },
  {
    timeframe: '3M',
    market_cap: 412000000, // $412M
    total_properties: 2756,
    avg_yield: 7.9,
    market_trend: 'bullish',
    volatility_index: 28.1,
    investor_sentiment: 72
  },
  {
    timeframe: '1Y',
    market_cap: 389000000, // $389M
    total_properties: 2456,
    avg_yield: 7.1,
    market_trend: 'neutral',
    volatility_index: 35.2,
    investor_sentiment: 65
  }
];

// ============================================================================
// PROPERTY RECOMMENDATIONS SEED DATA
// ============================================================================

const PROPERTY_RECOMMENDATIONS: PropertyRecommendationSeedInput[] = [
  {
    score: 0.92,
    reason: 'High rental demand in area, 15% projected value increase over next 12 months',
    expected_roi: 12.4,
    risk_level: 'Low',
    investment_amount: 50000,
    time_horizon: '12-18 months',
    expected_returns: 56200,
    risk_factors: ['Market saturation', 'Economic downturn'],
    opportunities: ['Rental income stability', 'Appreciation potential'],
    model_version: 'v1.0.0',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  },
  {
    score: 0.88,
    reason: 'Growing market with strong tourism sector and population influx',
    expected_roi: 10.8,
    risk_level: 'Medium',
    investment_amount: 75000,
    time_horizon: '18-24 months',
    expected_returns: 83100,
    risk_factors: ['Hurricane risk', 'Tourism dependency'],
    opportunities: ['Tax advantages', 'Growing rental market'],
    model_version: 'v1.0.0',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  {
    score: 0.85,
    reason: 'Tech sector recovery creating demand for premium office locations',
    expected_roi: 11.2,
    risk_level: 'Medium',
    investment_amount: 100000,
    time_horizon: '24-36 months',
    expected_returns: 111200,
    risk_factors: ['Remote work trends', 'Tech layoffs'],
    opportunities: ['Prime location', 'Long-term leases'],
    model_version: 'v1.0.0',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
];

// ============================================================================
// PORTFOLIO ANALYTICS SEED DATA
// ============================================================================

const PORTFOLIO_ANALYTICS: PortfolioAnalyticsSeedInput[] = [
  {
    diversification_score: 78,
    risk_exposure: 'medium',
    expected_returns: 9.8,
    recommendations: [
      {
        type: 'diversify',
        description: 'Add more commercial properties to balance residential-heavy portfolio',
        impact: 'Reduces overall risk by 15%'
      },
      {
        type: 'rebalance',
        description: 'Consider reducing exposure to high-volatility markets',
        impact: 'Improves portfolio stability'
      },
      {
        type: 'increase',
        description: 'Allocate more to undervalued Miami market opportunities',
        impact: 'Potential 12% return increase'
      }
    ],
    model_version: 'v1.0.0'
  }
];

// ============================================================================
// TOP PERFORMERS DATA - ERC-3643 Token Contracts
// ============================================================================

const TOP_PERFORMERS = [
  {
    property_name: 'Downtown Luxury',
    performance: '+15.3%',
    volume: '$2.1M',
    contract_address: '0x33c0024ebC7A8989c1aE32988d5402295c8fd42B' as Address, // ERC-3643 compliant token
  },
  {
    property_name: 'Beachfront Villa',
    performance: '+12.8%',
    volume: '$1.8M',
    contract_address: '0xF6F775DB26f2f54D9819CDE60B2E89b47DaF486F' as Address, // ERC-3643 compliant token
  },
  {
    property_name: 'Tech District Office',
    performance: '+10.2%',
    volume: '$1.5M',
    contract_address: '0x013d4865Fbed666E055B6653CAb0FF3caF923992' as Address, // ERC-3643 compliant token
  }
];

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

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedAIInsights() {
  console.log("\n🤖 Seeding AI Insights data with ERC-3643 validation...");

  try {
    // First, validate ERC-3643 token contracts
    console.log("  🔍 Validating ERC-3643 token contracts...");
    for (const performer of TOP_PERFORMERS) {
      const isValid = await validateERC3643Token(performer.contract_address);
      if (!isValid) {
        console.warn(`  ⚠️  Contract ${performer.contract_address} is not a valid ERC-3643 token`);
      } else {
        console.log(`  ✅ Validated ERC-3643 token: ${performer.contract_address}`);
      }
    }

    // Insert AI insights
    console.log("  📊 Inserting AI insights...");
    for (const insight of AI_INSIGHTS) {
      await pool.query(`
        INSERT INTO public.insights (
          insight_type, title, description, confidence_score, impact, category,
          model_version, expires_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        insight.insight_type,
        insight.title,
        insight.description,
        insight.confidence_score,
        insight.impact,
        insight.category,
        insight.model_version,
        insight.expires_at || null,
        insight.metadata ? JSON.stringify(insight.metadata) : null
      ]);
    }

    // Insert market analytics for different timeframes
    console.log("  📈 Inserting market analytics...");
    for (const analytics of MARKET_ANALYTICS) {
      await pool.query(`
        INSERT INTO public.market_analytics (
          timeframe, market_cap, total_properties, avg_yield,
          market_trend, volatility_index, investor_sentiment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        analytics.timeframe,
        analytics.market_cap,
        analytics.total_properties,
        analytics.avg_yield,
        analytics.market_trend,
        analytics.volatility_index,
        analytics.investor_sentiment
      ]);
    }

    // Get some existing users and properties for recommendations
    // Updated to work with EVM addresses in profiles table
    const usersResult = await pool.query(`
      SELECT id, evm_address, email FROM public.profiles
      WHERE evm_address IS NOT NULL AND evm_address != ''
      LIMIT 3
    `);

    // Updated property lookup to use EVM contract addresses
    const propertiesResult = await pool.query(`
      SELECT id, contract_address, name FROM public.properties
      WHERE contract_address IS NOT NULL AND contract_address != ''
      LIMIT 3
    `);

    if (usersResult.rows.length > 0 && propertiesResult.rows.length > 0) {
      console.log("  💡 Inserting property recommendations...");

      for (let i = 0; i < Math.min(PROPERTY_RECOMMENDATIONS.length, usersResult.rows.length, propertiesResult.rows.length); i++) {
        const rec: PropertyRecommendationSeedInput = PROPERTY_RECOMMENDATIONS[i] as PropertyRecommendationSeedInput;
        const user = usersResult.rows[i];
        const property = propertiesResult.rows[i];

        await pool.query(`
          INSERT INTO public.property_recommendations (
            property_id, user_id, score, reason, expected_roi, risk_level,
            investment_amount, time_horizon, expected_returns, risk_factors,
            opportunities, model_version, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          property.id,
          user.id,
          rec.score,
          rec.reason,
          rec.expected_roi,
          rec.risk_level.toLowerCase(),
          rec.investment_amount,
          rec.time_horizon,
          rec.expected_returns,
          rec.risk_factors,
          rec.opportunities,
          rec.model_version,
          rec.expires_at
        ]);
      }
    } else {
      console.log("  ⚠️  Skipping property recommendations - no users/properties found with EVM addresses");
    }

    // Insert portfolio analytics for available users with EVM addresses
    if (usersResult.rows.length > 0) {
      console.log("  📊 Inserting portfolio analytics...");

      for (let i = 0; i < Math.min(PORTFOLIO_ANALYTICS.length, usersResult.rows.length); i++) {
        const analytics: PortfolioAnalyticsSeedInput = PORTFOLIO_ANALYTICS[i] as PortfolioAnalyticsSeedInput;
        const user = usersResult.rows[i];

        await pool.query(`
          INSERT INTO public.portfolio_analytics (
            user_id, diversification_score, risk_exposure, expected_returns,
            recommendations, model_version
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          user.id,
          analytics.diversification_score,
          analytics.risk_exposure,
          analytics.expected_returns,
          JSON.stringify(analytics.recommendations),
          analytics.model_version
        ]);
      }
    }

    console.log("✅ AI insights data seeded successfully with ERC-3643 validation");

  } catch (error) {
    console.error("❌ Error seeding AI insights:", error);
    throw error;
  }
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedAIDatabase() {
  console.log("🎯 Starting AI Insights database seeding with ERC-3643 EVM validation...");

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log("✅ Database connection established");

    // Test EVM blockchain connection
    console.log("🔗 Testing EVM blockchain connection...");
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Connected to EVM network (${publicClient.chain.name}), current block: ${blockNumber}`);

    // Seed AI insights data
    await seedAIInsights();

    // Print summary
    const insightsCount = await pool.query("SELECT COUNT(*) FROM public.insights");
    const marketCount = await pool.query("SELECT COUNT(*) FROM public.market_analytics");
    const recommendationsCount = await pool.query("SELECT COUNT(*) FROM public.property_recommendations");
    const portfolioCount = await pool.query("SELECT COUNT(*) FROM public.portfolio_analytics");

    console.log("\n📊 AI Insights Seed Summary:");
    console.log(`   AI Insights: ${insightsCount.rows[0].count}`);
    console.log(`   Market Analytics: ${marketCount.rows[0].count}`);
    console.log(`   Property Recommendations: ${recommendationsCount.rows[0].count}`);
    console.log(`   Portfolio Analytics: ${portfolioCount.rows[0].count}`);
    console.log("\n✨ AI insights seed completed successfully with ERC-3643 EVM validation!\n");

  } catch (error) {
    console.error("❌ Error seeding AI database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

// Run seed if called directly
if (import.meta.main) {
  seedAIDatabase()
    .then(() => {
      console.log("🎉 AI insights seed script finished with ERC-3643 EVM validation");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 AI insights seed script failed:", error);
      process.exit(1);
    });
}

export {
  seedAIDatabase,
  seedAIInsights,
  validateERC3643Token,
  getERC3643TokenInfo,
  AI_INSIGHTS,
  MARKET_ANALYTICS,
  PROPERTY_RECOMMENDATIONS,
  PORTFOLIO_ANALYTICS,
  TOP_PERFORMERS,
  publicClient,
  supportedChains
};
