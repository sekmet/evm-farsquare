import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  MapPin,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Coins,
  Home,
  Building,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  Clock,
  Target,
} from "lucide-react";

// Property types for API data
interface Property {
  id: string;
  contract_address: string;
  token_symbol: string;
  name: string;
  description: string;
  location: string;
  property_type: 'residential' | 'commercial' | 'mixed';
  total_tokens: number;
  available_tokens: number;
  token_price: number;
  total_value: number;
  annual_yield: number;
  risk_level: 'low' | 'medium' | 'high';
  features: string[];
  images: string[];
  funding_progress: number;
  minimum_investment: number;
  status: 'active' | 'funded' | 'cancelled' | 'archived';
  created_at: Date;
  updated_at: Date;
  weekly_volume?: number;
  avg_price_7d?: number;
  max_investors_7d?: number;
}

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API configuration
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const fetchProperty = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProperty(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch property');
      }
    } catch (err) {
      setError("Failed to load property details");
      console.error("Property fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperty();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-1/3" />
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !property) {
    return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <AlertCircle className="w-16 h-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Property Not Found</h2>
                <p className="text-muted-foreground">
                  {error || "The property you're looking for doesn't exist."}
                </p>
              </div>
              <Button asChild>
                <Link to="/properties">Browse Properties</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "low": return "default";
      case "medium": return "secondary";
      case "high": return "destructive";
      default: return "outline";
    }
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case "residential": return <Home className="w-5 h-5 text-blue-500" />;
      case "commercial": return <Building className="w-5 h-5 text-green-500" />;
      default: return <MapPin className="w-5 h-5 text-gray-500" />;
    }
  };

  const fundingProgress = property.funding_progress;
  const tokensSold = property.total_tokens - property.available_tokens;
  const tokensAvailable = property.available_tokens;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link to="/properties" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Properties
              </Link>
            </Button>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  {getPropertyTypeIcon(property.property_type)}
                  <Badge variant="outline" className="text-sm">
                    {property.property_type}
                  </Badge>
                  <Badge variant={getRiskBadgeVariant(property.risk_level)}>
                    {property.risk_level} risk
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {property.annual_yield}% yield
                  </Badge>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-3">{property.name}</h1>
                <p className="text-muted-foreground text-lg flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5" />
                  {property.location}
                </p>

                <p className="text-lg leading-relaxed">{property.description}</p>
              </div>

              <div className="lg:w-80">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Investment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Token Price</p>
                        <p className="text-2xl font-bold">${property.token_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Min. Investment</p>
                        <p className="text-xl font-semibold">${property.minimum_investment.toFixed(2)}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Funding Progress</span>
                        <span className="font-medium">{fundingProgress}%</span>
                      </div>
                      <Progress value={fundingProgress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{tokensSold.toLocaleString()} tokens sold</span>
                        <span>{tokensAvailable.toLocaleString()} available</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-lg font-semibold">${property.total_value.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Annual Yield</p>
                        <p className="text-lg font-semibold text-green-600">{property.annual_yield}%</p>
                      </div>
                    </div>

                    <Button className="w-full" size="lg">
                      <Coins className="w-4 h-4 mr-2" />
                      Invest Now
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Property Images */}
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-[16/9] bg-muted rounded-t-lg flex items-center justify-center">
                    {property.images.length > 0 ? (
                      <img
                        src={property.images[0]}
                        alt={property.name}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Home className="w-16 h-16 mx-auto mb-4" />
                        <p>No property images available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              {property.features.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Property Features</CardTitle>
                    <CardDescription>Key amenities and highlights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {property.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Market Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Analytics</CardTitle>
                  <CardDescription>Recent trading activity and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">
                        {property.weekly_volume ? `$${property.weekly_volume.toLocaleString()}` : 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">Weekly Volume</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">
                        {property.avg_price_7d ? `$${property.avg_price_7d.toFixed(2)}` : 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">7-Day Avg Price</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <p className="text-2xl font-bold">
                        {property.max_investors_7d || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Investors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Investment Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Investment Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Token Symbol</span>
                      <Badge variant="outline">{property.token_symbol}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Contract Address</span>
                      <Button variant="ghost" size="sm" className="h-auto p-0 font-mono text-xs">
                        {property.contract_address.slice(0, 8)}...{property.contract_address.slice(-8)}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Property Type</span>
                      <div className="flex items-center gap-1">
                        {getPropertyTypeIcon(property.property_type)}
                        <span className="text-sm capitalize">{property.property_type}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Risk Level</span>
                      <Badge variant={getRiskBadgeVariant(property.risk_level)}>
                        {property.risk_level}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">{new Date(property.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Investment Calculator */}
              <Card>
                <CardHeader>
                  <CardTitle>Investment Calculator</CardTitle>
                  <CardDescription>Calculate potential returns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Investment Amount ($)</label>
                      <input
                        type="number"
                        className="w-full mt-1 p-2 border rounded-md"
                        placeholder="1000"
                        min={property.minimum_investment}
                        step="0.01"
                      />
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Tokens to Receive</div>
                      <div className="text-lg font-semibold">0.00</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-sm text-green-700 dark:text-green-300 mb-1">Est. Annual Return</div>
                      <div className="text-lg font-semibold text-green-600">$0.00</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
