import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Building,
  Users,
  Shield,
  Coins,
  MapPin,
  Calendar,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  BarChart3,
  PieChart,
  Activity,
  Globe,
  Lock,
  Zap
} from "lucide-react";
import { useProperties } from "@/hooks/use-properties";
import { useWallet } from "@/contexts/wallet-context";

const API_BASE_URL = import.meta.env.VITE_BASE_API_URL || 'http://localhost:3000';

const PropertiesOverview = () => {
  const { state } = useWallet();
  const { properties, stats, isLoading } = useProperties({
    search: '',
    propertyType: 'all',
    priceRange: 'all',
    yieldRange: 'all',
    riskLevel: 'all',
    sortBy: 'yield',
    sortOrder: 'desc',
  });

  // Fetch recent activity
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [marketStats, setMarketStats] = useState<any[]>([]);
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/activity/recent?limit=5`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecentActivity(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch activity:', err));

    // Fetch market statistics from backend
    fetch(`${API_BASE_URL}/api/market/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const stats = data.data;
          setMarketStats([
            {
              label: "Total Properties",
              value: stats.totalProperties,
              change: "+12%",
              trend: "up",
              icon: Home,
            },
            {
              label: "Average Yield",
              value: `${stats.averageYield.toFixed(1)}%`,
              change: "+0.5%",
              trend: "up",
              icon: TrendingUp,
            },
            {
              label: "Total Value",
              value: `$${(stats.totalValue / 1000000).toFixed(1)}M`,
              change: "+8%",
              trend: "up",
              icon: DollarSign,
            },
            {
              label: "Active Investors",
              value: stats.activeInvestors.toLocaleString(),
              change: "+15%",
              trend: "up",
              icon: Users,
            },
          ]);
        } else {
          // Fallback to hardcoded values if API fails
          setMarketStats([
            {
              label: "Total Properties",
              value: 150,
              change: "+12%",
              trend: "up",
              icon: Home,
            },
            {
              label: "Average Yield",
              value: "7.8%",
              change: "+0.5%",
              trend: "up",
              icon: TrendingUp,
            },
            {
              label: "Total Value",
              value: "$250M",
              change: "+8%",
              trend: "up",
              icon: DollarSign,
            },
            {
              label: "Active Investors",
              value: "2,847",
              change: "+15%",
              trend: "up",
              icon: Users,
            },
          ]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch market stats:', err);
      });
  }, []);

  // Market statistics for the overview

  const ecosystemFeatures = [
    {
      title: "Tokenized Real Estate",
      description: "Fractional ownership through ERC-3643 compliant security tokens",
      icon: Building,
      benefits: ["Regulatory Compliance", "Fractional Ownership", "Liquidity"],
    },
    {
      title: "EVM Multi-Chain Settlement",
      description: "Decentralized settlement for all property transactions on EVM networks",
      icon: Coins,
      benefits: ["Fast Settlements", "Low Fees", "Multi-Chain Support"],
    },
    {
      title: "ERC-3643 Smart Contracts",
      description: "Secure, audited ERC-3643 compliant smart contracts",
      icon: Shield,
      benefits: ["Audited Code", "Immutable Logic", "Transparent"],
    },
    {
      title: "Real-time Analytics",
      description: "Live market data, yield tracking, and performance metrics",
      icon: BarChart3,
      benefits: ["Live Updates", "Performance Tracking", "Market Insights"],
    },
  ];

  // Use real properties from API - take top 3 by yield
  const investmentOpportunities = (properties || []).slice(0, 3).map((p: any) => ({
    id: p.id,
    name: p.name,
    location: p.location,
    type: p.property_type,
    tokenPrice: p.token_price,
    annualYield: p.annual_yield,
    fundingProgress: ((p.total_tokens - p.available_tokens) / p.total_tokens) * 100,
    riskLevel: p.risk_level,
    investors: Math.floor(Math.random() * 300), // TODO: Get from actual data
    image: p.images?.[0] || "/api/placeholder/400/300",
  }));

  // Activity data loaded from API via useEffect above
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <div className="w-full">
      {/* Hero Section */}
      <section className="pb-16 pt-6">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-4">
              <Zap className="w-3 h-3 mr-1" />
              Powered by Multi-Chain EVM Networks & ERC-3643
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Tokenized Real Estate
              <br />
              <span className="text-foreground">Ecosystem</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Invest in fractional real estate ownership through ERC-3643 compliant security tokens.
              Experience decentralized property investment with EVM Multi-Chain settlement and audited smart contracts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/properties">
                  <Coins className="w-5 h-5 mr-2" />
                  Explore Properties
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/properties/manage/add">
                  <Building className="w-5 h-5 mr-2" />
                  Add Property
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Market Statistics */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Market Overview</h2>
            <p className="text-muted-foreground">Real-time insights into the tokenized real estate market</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {marketStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <stat.icon className="w-8 h-8 text-primary" />
                    <Badge
                      variant={stat.trend === 'up' ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {stat.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {stat.change}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ecosystem Features</h2>
            <p className="text-muted-foreground">Comprehensive platform for tokenized real estate investment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {ecosystemFeatures.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Opportunities Preview */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Featured Properties</h2>
              <p className="text-muted-foreground">Discover high-yield investment opportunities</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/properties">
                View All Properties
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {investmentOpportunities.map((property) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted relative">
                  {property.image ? (
                    <img
                      src={property.image}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Building className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline">
                      {property.riskLevel} risk
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{property.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {property.location}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Token Price</p>
                        <p className="font-semibold">${property.tokenPrice}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Annual Yield</p>
                        <p className="font-semibold text-green-600">{property.annualYield}%</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Funding Progress</span>
                        <span>{property.fundingProgress}%</span>
                      </div>
                      <Progress value={property.fundingProgress} className="h-2" />
                    </div>

                    <Button className="w-full" asChild>
                      <Link to={`/properties/${property.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity & Platform Info */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Recent Activity */}
            <div>
              <h3 className="text-2xl font-bold mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {activity.type === 'investment' && <Coins className="w-4 h-4 text-primary" />}
                          {activity.type === 'property' && <Building className="w-4 h-4 text-primary" />}
                          {activity.type === 'yield' && <TrendingUp className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-semibold">{activity.user}</span> {activity.action}
                            {activity.amount && (
                              <span className="font-semibold text-primary ml-1">
                                ${activity.amount ? activity.amount.toLocaleString() : '0'}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Platform Information */}
            <div>
              <h3 className="text-2xl font-bold mb-6">Platform Information</h3>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>ERC-3643 Compliance:</strong> All property tokens are issued as ERC-3643 compliant security tokens with full regulatory compliance on EVM networks.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Multi-Chain Smart Contract Security:</strong> Properties are tokenized using audited ERC-3643 smart contracts on Ethereum Virtual Machine networks.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <Coins className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Multi-Chain Settlement:</strong> All property transactions settle using EVM native mechanisms for fast, secure settlement across supported networks.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="font-semibold">Global Access</p>
                      <p className="text-sm text-muted-foreground">Invest from anywhere</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="font-semibold">Secure</p>
                      <p className="text-sm text-muted-foreground">Bank-level security</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Start Investing?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of investors in the future of real estate ownership.
                Start with as little as $100 and earn passive income from tokenized properties.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/properties">
                    <Coins className="w-5 h-5 mr-2" />
                    Browse Properties
                  </Link>
                </Button>
                {!state.isConnected && (
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/onboarding/start">
                      <Star className="w-5 h-5 mr-2" />
                      Get Started
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
    </div>
  );
};

export default PropertiesOverview;
