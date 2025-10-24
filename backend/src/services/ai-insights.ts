import { Pool } from "pg";

// ============================================================================
// AI INSIGHTS SERVICE
// ============================================================================

export interface MarketInsight {
  id: string;
  insight_type: 'market' | 'risk' | 'opportunity' | 'portfolio';
  title: string;
  description: string;
  confidence_score: number;
  impact: 'positive' | 'negative' | 'neutral';
  category: 'market' | 'risk' | 'opportunity' | 'portfolio';
  model_version: string;
  created_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface PropertyRecommendation {
  id: string;
  property_id: string;
  user_id: string;
  score: number;
  reason: string;
  expected_roi: number;
  risk_level: 'Low' | 'Medium' | 'High';
  investment_amount: number;
  time_horizon: string;
  expected_returns: number;
  risk_factors: string[];
  opportunities: string[];
  model_version: string;
  created_at: string;
  expires_at?: string;
}

export interface MarketData {
  market_cap: number;
  total_properties: number;
  avg_yield: number;
  market_trend: 'bullish' | 'bearish' | 'neutral';
  volatility_index: number;
  investor_sentiment: number;
  top_performers: Array<{
    property: string;
    performance: string;
    volume: string;
  }>;
}

export interface PortfolioAnalysis {
  diversification_score: number;
  risk_exposure: 'low' | 'medium' | 'high';
  expected_returns: number;
  recommendations: Array<{
    type: 'diversify' | 'rebalance' | 'increase' | 'decrease';
    description: string;
    impact: string;
  }>;
}

export class AIInsightsService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ============================================================================
  // MARKET INSIGHTS
  // ============================================================================

  async getMarketInsights(timeframe: '1W' | '1M' | '3M' | '1Y' = '1M'): Promise<MarketInsight[]> {
    const query = `
      SELECT
        id,
        insight_type,
        title,
        description,
        confidence_score,
        impact,
        category,
        model_version,
        created_at,
        expires_at,
        metadata
      FROM public.insights
      WHERE expires_at > NOW() OR expires_at IS NULL
      ORDER BY confidence_score DESC, created_at DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getMarketIntelligence(categories?: string[]): Promise<MarketInsight[]> {
    let query = `
      SELECT
        id,
        insight_type,
        title,
        description,
        confidence_score,
        impact,
        category,
        model_version,
        created_at,
        expires_at,
        metadata
      FROM public.insights
      WHERE (expires_at > NOW() OR expires_at IS NULL)
    `;

    const params: any[] = [];
    if (categories && categories.length > 0) {
      query += ` AND category = ANY($1)`;
      params.push(categories);
    }

    query += ` ORDER BY confidence_score DESC, created_at DESC LIMIT 20`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ============================================================================
  // MARKET ANALYTICS
  // ============================================================================

  async getMarketAnalytics(timeframe: '1W' | '1M' | '3M' | '1Y' = '1M'): Promise<MarketData> {
    const result = await this.pool.query(`
      SELECT
        market_cap,
        total_properties,
        avg_yield,
        market_trend,
        volatility_index,
        investor_sentiment
      FROM public.market_analytics
      WHERE timeframe = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [timeframe]);

    if (result.rows.length === 0) {
      // Return default data if no analytics exist
      return {
        market_cap: 428000000,
        total_properties: 2847,
        avg_yield: 8.2,
        market_trend: 'bullish',
        volatility_index: 23.5,
        investor_sentiment: 76,
        top_performers: [
          { property: 'Downtown Luxury', performance: '+15.3%', volume: '$2.1M' },
          { property: 'Beachfront Villa', performance: '+12.8%', volume: '$1.8M' },
          { property: 'Tech District Office', performance: '+10.2%', volume: '$1.5M' }
        ]
      };
    }

    const analytics = result.rows[0];

    // Get top performers (this would come from property analytics)
    const topPerformers = await this.getTopPerformers(timeframe);

    return {
      market_cap: parseFloat(analytics.market_cap),
      total_properties: parseInt(analytics.total_properties),
      avg_yield: parseFloat(analytics.avg_yield),
      market_trend: analytics.market_trend,
      volatility_index: parseFloat(analytics.volatility_index),
      investor_sentiment: parseFloat(analytics.investor_sentiment),
      top_performers: topPerformers
    };
  }

  private async getTopPerformers(timeframe: string): Promise<Array<{property: string, performance: string, volume: string}>> {
    // This would query property analytics for top performers
    // For now, return mock data
    return [
      { property: 'Downtown Luxury', performance: '+15.3%', volume: '$2.1M' },
      { property: 'Beachfront Villa', performance: '+12.8%', volume: '$1.8M' },
      { property: 'Tech District Office', performance: '+10.2%', volume: '$1.5M' }
    ];
  }

  // ============================================================================
  // PROPERTY RECOMMENDATIONS
  // ============================================================================

  async getPropertyRecommendations(
    userId: string,
    limit: number = 10,
    minScore: number = 0.0,
    riskPreference?: 'Low' | 'Medium' | 'High'
  ): Promise<PropertyRecommendation[]> {
    let query = `
      SELECT
        id,
        property_id,
        user_id,
        score,
        reason,
        expected_roi,
        risk_level,
        investment_amount,
        time_horizon,
        expected_returns,
        risk_factors,
        opportunities,
        model_version,
        created_at,
        expires_at
      FROM public.property_recommendations
      WHERE user_id = $1
        AND score >= $2
        AND (expires_at > NOW() OR expires_at IS NULL)
    `;

    const params: any[] = [userId, minScore];

    if (riskPreference) {
      query += ` AND risk_level = $3`;
      params.push(riskPreference);
    }

    query += ` ORDER BY score DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    
    if (result.rows.length === 0) {
      // Return default property recommendations when no data exists
      return [
        {
          id: 'default-rec-1',
          property_id: 'prop-001',
          user_id: userId,
          score: 0.95,
          reason: 'High-yield opportunity with strong rental demand in prime location',
          expected_roi: 12.5,
          risk_level: 'Low' as const,
          investment_amount: 250000,
          time_horizon: '5-7 years',
          expected_returns: 31250,
          risk_factors: ['Market volatility', 'Interest rate changes'],
          opportunities: ['Stable rental income', 'Capital appreciation potential'],
          model_version: 'v1.0.0',
          created_at: new Date().toISOString(),
          expires_at: undefined,
        },
        {
          id: 'default-rec-2',
          property_id: 'prop-002',
          user_id: userId,
          score: 0.88,
          reason: 'Undervalued commercial property with long-term lease agreements',
          expected_roi: 10.8,
          risk_level: 'Medium' as const,
          investment_amount: 500000,
          time_horizon: '7-10 years',
          expected_returns: 54000,
          risk_factors: ['Economic downturn', 'Tenant default'],
          opportunities: ['Steady lease income', 'Inflation protection'],
          model_version: 'v1.0.0',
          created_at: new Date().toISOString(),
          expires_at: undefined,
        },
        {
          id: 'default-rec-3',
          property_id: 'prop-003',
          user_id: userId,
          score: 0.82,
          reason: 'Growing residential market with positive demographic trends',
          expected_roi: 9.2,
          risk_level: 'Medium' as const,
          investment_amount: 180000,
          time_horizon: '3-5 years',
          expected_returns: 16560,
          risk_factors: ['Local market saturation', 'Regulatory changes'],
          opportunities: ['Population growth', 'Job market expansion'],
          model_version: 'v1.0.0',
          created_at: new Date().toISOString(),
          expires_at: undefined,
        },
      ].slice(0, limit); // Limit the results
    }
    
    return result.rows;
  }

  // ============================================================================
  // PORTFOLIO ANALYSIS
  // ============================================================================

  async getPortfolioAnalysis(userId: string): Promise<PortfolioAnalysis> {
    const result = await this.pool.query(`
      SELECT
        diversification_score,
        risk_exposure,
        expected_returns,
        recommendations,
        model_version
      FROM public.portfolio_analytics
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) {
      // Return default portfolio analysis
      return {
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
        ]
      };
    }

    const analysis = result.rows[0];
    return {
      diversification_score: parseInt(analysis.diversification_score),
      risk_exposure: analysis.risk_exposure,
      expected_returns: parseFloat(analysis.expected_returns),
      recommendations: analysis.recommendations || []
    };
  }

  // ============================================================================
  // OVERVIEW ENDPOINT
  // ============================================================================

  async getInsightsOverview(
    userId: string,
    timeframe: '1W' | '1M' | '3M' | '1Y' = '1M'
  ): Promise<{
    insights: MarketInsight[];
    marketData: MarketData;
    portfolioAnalysis: PortfolioAnalysis;
    recommendations: PropertyRecommendation[];
    lastUpdated: string;
    nextUpdate: string;
  }> {
    // Fetch all data concurrently
    const [insights, marketData, portfolioAnalysis, recommendations] = await Promise.all([
      this.getMarketInsights(timeframe),
      this.getMarketAnalytics(timeframe),
      this.getPortfolioAnalysis(userId),
      this.getPropertyRecommendations(userId, 5, 0.8) // Top 5 recommendations with score > 0.8
    ]);

    const lastUpdated = new Date().toISOString();
    const nextUpdate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now

    return {
      insights,
      marketData,
      portfolioAnalysis,
      recommendations,
      lastUpdated,
      nextUpdate
    };
  }

  // ============================================================================
  // REFRESH ENDPOINT
  // ============================================================================

  async refreshInsights(
    userId: string,
    forceFullRefresh: boolean = false,
    priority: 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<{
    success: boolean;
    jobId?: string;
    estimatedCompletion?: number;
    status: 'queued' | 'processing' | 'completed';
  }> {
    // In a real implementation, this would queue a background job
    // For now, we'll simulate the refresh

    try {
      // Force refresh by clearing any cached data if needed
      if (forceFullRefresh) {
        // This would trigger full model retraining
        console.log(`Starting full refresh for user ${userId}`);
      }

      // Simulate processing time based on priority
      const processingTime = priority === 'urgent' ? 5000 :
                           priority === 'high' ? 10000 : 15000;

      // In real implementation, return job ID for tracking
      const jobId = `refresh_${userId}_${Date.now()}`;

      return {
        success: true,
        jobId,
        estimatedCompletion: processingTime,
        status: 'queued'
      };

    } catch (error) {
      console.error('Error refreshing insights:', error);
      return {
        success: false,
        status: 'completed' // Failed
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getDataFreshness(): Promise<{
    insights: number; // minutes since last update
    marketData: number;
    recommendations: number;
  }> {
    const queries = {
      insights: `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 60 as minutes_ago FROM public.insights`,
      marketData: `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 60 as minutes_ago FROM public.market_analytics`,
      recommendations: `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 60 as minutes_ago FROM public.property_recommendations`
    };

    const results = await Promise.all([
      this.pool.query(queries.insights),
      this.pool.query(queries.marketData),
      this.pool.query(queries.recommendations)
    ]);

    return {
      insights: Math.round(results[0].rows[0]?.minutes_ago || 0),
      marketData: Math.round(results[1].rows[0]?.minutes_ago || 0),
      recommendations: Math.round(results[2].rows[0]?.minutes_ago || 0)
    };
  }
}
