// AI Insights API service for frontend
import { SecureApiClient, SecureApiResponse } from "./secure-api";

// API response types matching backend
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

export interface InsightsOverviewResponse {
  success: boolean;
  data: {
    insights: MarketInsight[];
    marketData: MarketData;
    portfolioAnalysis: PortfolioAnalysis;
    recommendations: PropertyRecommendation[];
    lastUpdated: string;
    nextUpdate: string;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime: number;
  };
}

export interface RefreshResponse {
  success: boolean;
  jobId?: string;
  estimatedCompletion?: number;
  status: 'queued' | 'processing' | 'completed';
}

// AI Insights API service class
export class AIInsightsApiService {
  private client: SecureApiClient;

  constructor(baseUrl?: string) {
    this.client = new SecureApiClient(baseUrl);
  }

  /**
   * Get complete insights overview (all 4 insight cards + market data + portfolio analysis)
   */
  async getInsightsOverview(
    userId: string,
    timeframe: '1W' | '1M' | '3M' | '1Y' = '1M'
  ): Promise<SecureApiResponse<InsightsOverviewResponse['data']>> {
    return this.client.makeRequest<InsightsOverviewResponse['data']>(
      `/api/v1/insights/overview?user_id=${encodeURIComponent(userId)}&timeframe=${timeframe}`
    );
  }

  /**
   * Get market intelligence insights (filtered by categories)
   */
  async getMarketIntelligence(
    timeframe: '1W' | '1M' | '3M' | '1Y' = '1M',
    categories?: string[]
  ): Promise<SecureApiResponse<MarketInsight[]>> {
    let url = `/api/v1/market/intelligence?timeframe=${timeframe}`;
    if (categories && categories.length > 0) {
      url += `&categories=${categories.join(',')}`;
    }

    return this.client.makeRequest<MarketInsight[]>(url);
  }

  /**
   * Get market analytics data
   */
  async getMarketAnalytics(
    timeframe: '1W' | '1M' | '3M' | '1Y' = '1M'
  ): Promise<SecureApiResponse<MarketData>> {
    return this.client.makeRequest<MarketData>(
      `/api/v1/market/analytics?timeframe=${timeframe}`
    );
  }

  /**
   * Get portfolio analysis for user
   */
  async getPortfolioAnalysis(
    userId: string,
    includeRecommendations: boolean = true,
    depth: 'basic' | 'full' = 'full'
  ): Promise<SecureApiResponse<PortfolioAnalysis>> {
    return this.client.makeRequest<PortfolioAnalysis>(
      `/api/v1/portfolio/${encodeURIComponent(userId)}/analysis?include_recommendations=${includeRecommendations}&depth=${depth}`
    );
  }

  /**
   * Get property recommendations for user
   */
  async getPropertyRecommendations(
    userId: string,
    limit: number = 10,
    minScore: number = 0.0,
    riskPreference?: 'Low' | 'Medium' | 'High'
  ): Promise<SecureApiResponse<PropertyRecommendation[]>> {
    let url = `/api/v1/portfolio/${encodeURIComponent(userId)}/recommendations?limit=${limit}&min_score=${minScore}`;
    if (riskPreference) {
      url += `&risk_preference=${riskPreference}`;
    }

    return this.client.makeRequest<PropertyRecommendation[]>(url);
  }

  /**
   * Refresh insights data
   */
  async refreshInsights(
    userId: string,
    forceFullRefresh: boolean = false,
    priority: 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<SecureApiResponse<RefreshResponse>> {
    return this.client.makeRequest<RefreshResponse>(
      '/api/v1/insights/refresh',
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          force_full_refresh: forceFullRefresh,
          priority
        })
      }
    );
  }
}

// Create singleton instance
export const aiInsightsApi = new AIInsightsApiService();

// Helper functions for data transformation
export const transformMarketInsight = (apiInsight: MarketInsight): any => {
  // Transform backend insight to frontend format
  const iconMap = {
    market: 'TrendingUp',
    risk: 'Target',
    opportunity: 'Lightbulb',
    portfolio: 'BarChart3'
  };

  return {
    id: apiInsight.id,
    icon: iconMap[apiInsight.category] || 'Brain',
    title: apiInsight.title,
    description: apiInsight.description,
    color: getColorForImpact(apiInsight.impact),
    impact: apiInsight.impact,
    confidence: Math.round(apiInsight.confidence_score * 100), // Convert to percentage
    category: apiInsight.category
  };
};

export const transformPropertyRecommendation = (apiRec: PropertyRecommendation): any => {
  return {
    id: apiRec.id,
    title: `Property ${apiRec.property_id}`, // Would need to join with property data
    location: 'Location TBD', // Would need property location
    score: Math.round(apiRec.score * 100),
    reason: apiRec.reason,
    roi: `${apiRec.expected_roi.toFixed(1)}%`,
    risk: apiRec.risk_level,
    propertyType: 'Residential', // Would need property type
    investmentAmount: `$${apiRec.investment_amount.toLocaleString()}`,
    timeHorizon: apiRec.time_horizon,
    expectedReturns: `$${apiRec.expected_returns.toLocaleString()}`,
    riskFactors: apiRec.risk_factors,
    opportunities: apiRec.opportunities
  };
};

export const transformMarketData = (apiData: MarketData): any => {
  return {
    marketCap: `$${apiData.market_cap.toLocaleString()}`,
    totalProperties: apiData.total_properties,
    avgYield: `${apiData.avg_yield.toFixed(1)}%`,
    marketTrend: apiData.market_trend,
    volatilityIndex: Math.round(apiData.volatility_index * 10) / 10,
    investorSentiment: Math.round(apiData.investor_sentiment),
    topPerformers: apiData.top_performers
  };
};

export const transformPortfolioAnalysis = (apiAnalysis: PortfolioAnalysis): any => {
  return {
    diversificationScore: apiAnalysis.diversification_score,
    riskExposure: apiAnalysis.risk_exposure.charAt(0).toUpperCase() + apiAnalysis.risk_exposure.slice(1),
    expectedReturns: `${apiAnalysis.expected_returns.toFixed(1)}%`,
    recommendations: apiAnalysis.recommendations
  };
};

const getColorForImpact = (impact: string): string => {
  switch (impact) {
    case 'positive': return 'text-success';
    case 'negative': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
};
