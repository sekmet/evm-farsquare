import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Brain, Target, BarChart3, Lightbulb, ArrowRight, RefreshCw, AlertCircle, TrendingDown, Activity, DollarSign, Home, Users, Calendar, Zap, Shield, Globe } from "lucide-react";
import { useWallet } from "@/contexts/wallet-context";
import { aiInsightsApi, transformMarketInsight, transformPropertyRecommendation, transformMarketData, transformPortfolioAnalysis } from "@/lib/ai-insights-api";

interface MarketInsight {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  category: "market" | "risk" | "opportunity" | "portfolio";
}

interface PropertyRecommendation {
  id: string;
  title: string;
  location: string;
  score: number;
  reason: string;
  roi: string;
  risk: "Low" | "Medium" | "High";
  propertyType: string;
  investmentAmount: string;
  timeHorizon: string;
  expectedReturns: string;
  riskFactors: string[];
  opportunities: string[];
}

interface MarketData {
  marketCap: string;
  totalProperties: number;
  avgYield: string;
  marketTrend: "bullish" | "bearish" | "neutral";
  volatilityIndex: number;
  investorSentiment: number;
  topPerformers: Array<{
    property: string;
    performance: string;
    volume: string;
  }>;
}

interface PortfolioAnalysis {
  diversificationScore: number;
  riskExposure: string;
  expectedReturns: string;
  recommendations: Array<{
    type: "diversify" | "rebalance" | "increase" | "decrease";
    description: string;
    impact: string;
  }>;
}

const AIInsights = () => {
  const { state: walletState } = useWallet();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeframe, setTimeframe] = useState("1M");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // API data state
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<PropertyRecommendation[]>([]);

  // Use real wallet address or fallback to demo
  const userId = walletState.address || "demo-user-123";

  // API fetching functions
  const fetchInsightsData = async (selectedTimeframe: string = timeframe) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await aiInsightsApi.getInsightsOverview(userId, selectedTimeframe as '1W' | '1M' | '3M' | '1Y');

      if (response.success && response.data) {
        // Transform API data to frontend format
        const transformedInsights = response.data.insights.map(transformMarketInsight);
        
        // Filter to show only the latest insight for each category
        const latestInsightsByCategory = new Map<string, any>();
        transformedInsights.forEach(insight => {
          const category = insight.category;
          if (!latestInsightsByCategory.has(category) || 
              new Date(insight.created_at) > new Date(latestInsightsByCategory.get(category).created_at)) {
            latestInsightsByCategory.set(category, insight);
          }
        });
        const filteredInsights = Array.from(latestInsightsByCategory.values());
        
        const transformedMarketData = transformMarketData(response.data.marketData);
        const transformedPortfolioAnalysis = transformPortfolioAnalysis(response.data.portfolioAnalysis);
        const transformedRecommendations = response.data.recommendations.map(transformPropertyRecommendation);

        setInsights(filteredInsights);
        setMarketData(transformedMarketData);
        setPortfolioAnalysis(transformedPortfolioAnalysis);
        setRecommendations(transformedRecommendations);

        setLastUpdate(new Date(response.data.lastUpdated));
      } else {
        throw new Error(response.error?.message || 'Failed to fetch insights');
      }
    } catch (err) {
      console.error("AI insights fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load AI insights. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch insights on component mount and timeframe change
  useEffect(() => {
    fetchInsightsData();

    // Set up periodic updates (every 2 minutes)
    const interval = setInterval(() => fetchInsightsData(), 120000);

    return () => clearInterval(interval);
  }, [timeframe]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiInsightsApi.refreshInsights(userId);

      if (response.success) {
        // Wait a bit then refetch data
        setTimeout(() => fetchInsightsData(), 2000);
      } else {
        throw new Error('Failed to refresh insights');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh insights.");
      setIsLoading(false);
    }
  };

  const getInsightIcon = (icon: React.ComponentType<{ className?: string }>) => icon;
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive": return "text-success";
      case "negative": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "Low": return "default";
      case "Medium": return "secondary";
      case "High": return "destructive";
      default: return "outline";
    }
  };

  const formatTimeframe = (tf: string) => {
    switch (tf) {
      case "1W": return "1 Week";
      case "1M": return "1 Month";
      case "3M": return "3 Months";
      case "1Y": return "1 Year";
      default: return "1 Month";
    }
  };

  if (isLoading && !lastUpdate) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-12 w-1/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-8 w-8 mb-2" />
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full">
        <div className="container mx-auto px-6 pt-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2">AI Insights</h1>
                  <p className="text-muted-foreground text-lg">
                    Data-driven recommendations powered by machine learning and market analytics
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1W">1 Week</SelectItem>
                    <SelectItem value="1M">1 Month</SelectItem>
                    <SelectItem value="3M">3 Months</SelectItem>
                    <SelectItem value="1Y">1 Year</SelectItem>
                  </SelectContent>
                </Select>
                {lastUpdate && (
                  <span className="text-sm text-muted-foreground">
                    Updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* AI Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {insights.map((insight) => {
              const Icon = getInsightIcon(insight.icon);
              return (
                <Card key={insight.id} className="hover:shadow-glow transition-all duration-200 hover:scale-105">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`h-8 w-8 ${insight.color}`} />
                      <Badge variant="outline" className="text-xs">
                        {insight.confidence}% confidence
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{insight.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getImpactColor(insight.impact)}`}></div>
                      <span className="text-xs capitalize">{insight.impact} impact</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Market Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Market Cap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{marketData?.marketCap || '$0'}</div>
                    <div className={`flex items-center gap-1 text-sm ${marketData?.marketTrend === 'bullish' ? 'text-success' : marketData?.marketTrend === 'bearish' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      <Activity className="w-4 h-4" />
                      <span className="capitalize">{marketData?.marketTrend || 'neutral'} trend</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Average Yield
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{marketData?.avgYield || '0%'}</div>
                    <div className="flex items-center gap-1 text-sm text-success">
                      <TrendingUp className="w-4 h-4" />
                      <span>Above market average</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Active Properties
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{marketData?.totalProperties ? marketData.totalProperties.toLocaleString() : '0'}</div>
                    <div className="flex items-center gap-1 text-sm text-accent">
                      <Home className="w-4 h-4" />
                      <span>Tokenized assets</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    Top Performing Properties
                  </CardTitle>
                  <CardDescription>Best performing assets in the last {formatTimeframe(timeframe)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {marketData?.topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-accent text-white' : index === 1 ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{performer.property}</div>
                            <div className="text-sm text-muted-foreground">Volume: {performer.volume}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-success">{performer.performance}</div>
                          <div className="text-sm text-muted-foreground">Performance</div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-muted-foreground py-4">
                        No top performers data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <div className="space-y-4">
                {recommendations.map((property) => (
                  <Card key={property.id} className="hover:border-primary transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-semibold">{property.title}</h3>
                            <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-primary/20 text-primary border-primary/30">
                              {property.score} Score
                            </Badge>
                            <Badge variant={getRiskBadgeVariant(property.risk)}>
                              {property.risk} Risk
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-4">{property.location} • {property.propertyType}</p>
                          <p className="text-sm mb-4">{property.reason}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                              <div className="text-sm text-muted-foreground mb-1">Expected ROI</div>
                              <div className="text-lg font-bold text-success">{property.roi}</div>
                            </div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                              <div className="text-sm text-muted-foreground mb-1">Investment</div>
                              <div className="text-lg font-bold">{property.investmentAmount}</div>
                            </div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                              <div className="text-sm text-muted-foreground mb-1">Time Horizon</div>
                              <div className="text-lg font-bold">{property.timeHorizon}</div>
                            </div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                              <div className="text-sm text-muted-foreground mb-1">Expected Return</div>
                              <div className="text-lg font-bold text-accent">{property.expectedReturns}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-destructive" />
                                Risk Factors
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {property.riskFactors.map((factor, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-success" />
                                Opportunities
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {property.opportunities.map((opportunity, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                                    {opportunity}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 lg:min-w-[200px]">
                          <Button className="w-full">View Details</Button>
                          <Button variant="outline" className="w-full">Add to Watchlist</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {/* Market Sentiment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Market Sentiment Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Market Trend</div>
                      <div className={`text-2xl font-bold capitalize ${marketData?.marketTrend === 'bullish' ? 'text-success' : marketData?.marketTrend === 'bearish' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {marketData?.marketTrend || 'neutral'}
                      </div>
                    </div>
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Volatility Index</div>
                      <div className="text-2xl font-bold">{marketData?.volatilityIndex || 0}</div>
                      <div className="text-sm text-muted-foreground">VIX Score</div>
                    </div>
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Investor Sentiment</div>
                      <div className="text-2xl font-bold">{marketData?.investorSentiment || 0}%</div>
                      <Progress value={marketData?.investorSentiment || 0} className="mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="portfolio" className="space-y-6">
              {/* Portfolio Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Portfolio Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Diversification Score</div>
                      <div className="text-3xl font-bold">{portfolioAnalysis?.diversificationScore || 0}/100</div>
                      <Progress value={portfolioAnalysis?.diversificationScore || 0} className="mt-2" />
                    </div>
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Risk Exposure</div>
                      <div className="text-2xl font-bold capitalize">{portfolioAnalysis?.riskExposure || 'unknown'}</div>
                    </div>
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Expected Returns</div>
                      <div className="text-2xl font-bold text-success">{portfolioAnalysis?.expectedReturns || '0%'}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">AI Recommendations</h3>
                    {portfolioAnalysis?.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          rec.type === 'diversify' ? 'bg-primary text-white' :
                          rec.type === 'rebalance' ? 'bg-accent text-white' :
                          rec.type === 'increase' ? 'bg-success text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium capitalize">{rec.type}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                          <Badge variant="outline" className="text-xs">
                            {rec.impact}
                          </Badge>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-muted-foreground py-4">
                        No portfolio recommendations available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
