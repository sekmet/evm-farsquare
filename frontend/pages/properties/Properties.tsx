import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { PropertyCard } from "@/components/properties/property-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, SlidersHorizontal, RefreshCw, AlertCircle, TrendingUp, Coins, TrendingDown, MapPin, DollarSign, Home, Building } from "lucide-react";

// Types for API data
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

interface PropertyStats {
  totalProperties: number;
  avgYield: string;
  totalValue: string;
  avgProgress: number;
}

const Properties = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("yield");
  const [priceRange, setPriceRange] = useState("all");
  const [yieldFilter, setYieldFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [properties, setProperties] = useState<Property[]>([]);

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Fetch properties from API
  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/properties`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProperties(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch properties');
      }
    } catch (err) {
      setError("Failed to load properties. Please try again.");
      console.error("Properties fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and refresh handler
  useEffect(() => {
    fetchProperties();
  }, []);

  const handleRefresh = async () => {
    await fetchProperties();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPropertyTypeFilter("all");
    setPriceRange("all");
    setYieldFilter("all");
    setSortBy("yield");
  };

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
      case "residential": return <Home className="w-4 h-4" />;
      case "commercial": return <Building className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  // Filter and sort properties based on user preferences
  const filteredProperties = useMemo(() => {
    let filtered = properties.filter((property) => {
      const matchesSearch = property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          property.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          property.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = propertyTypeFilter === "all" || property.property_type === propertyTypeFilter;

      const matchesPrice = priceRange === "all" ||
        (priceRange === "under-100" && property.token_price < 100) ||
        (priceRange === "100-200" && property.token_price >= 100 && property.token_price <= 200) ||
        (priceRange === "over-200" && property.token_price > 200);

      const matchesYield = yieldFilter === "all" ||
        (yieldFilter === "under-6" && property.annual_yield < 6) ||
        (yieldFilter === "6-8" && property.annual_yield >= 6 && property.annual_yield <= 8) ||
        (yieldFilter === "over-8" && property.annual_yield > 8);

      return matchesSearch && matchesType && matchesPrice && matchesYield;
    });

    // Sort properties
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "yield":
          return b.annual_yield - a.annual_yield;
        case "price-low":
          return a.token_price - b.token_price;
        case "price-high":
          return b.token_price - a.token_price;
        case "progress":
          return b.funding_progress - a.funding_progress;
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [properties, searchQuery, propertyTypeFilter, priceRange, yieldFilter, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const avgYield = properties.length > 0
      ? (properties.reduce((sum, p) => sum + p.annual_yield, 0) / totalProperties).toFixed(1)
      : "0.0";
    const totalValue = properties.length > 0
      ? properties.reduce((sum, p) => sum + p.total_value, 0)
      : 0;
    const avgProgress = properties.length > 0
      ? Math.round(properties.reduce((sum, p) => sum + p.funding_progress, 0) / totalProperties)
      : 0;

    return {
      totalProperties,
      avgYield,
      totalValue: `$${(totalValue / 1000000).toFixed(1)}M`,
      avgProgress
    };
  }, [properties]);

  // Simulate data fetching
  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (err) {
        setError("Failed to load properties. Please try again.");
        console.error("Properties fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);


  const isEligible = true;

  if (isLoading && properties.length === 0) {
    return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
          <div className="container mx-auto px-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-0">
                      <Skeleton className="h-48 w-full mb-4" />
                      <div className="p-6 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">All Properties</h1>
                <p className="text-muted-foreground text-lg">
                  Browse our complete collection of tokenized real estate investments
                </p>
              </div>
              <div className="flex items-center gap-3">
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

          {/* Market Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProperties}</div>
                <div className="text-sm text-muted-foreground mt-1">Available for investment</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Annual Yield</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgYield}%</div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-success">Above market avg</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalValue}</div>
                <div className="text-sm text-muted-foreground mt-1">Combined property value</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Funding Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgProgress}%</div>
                <div className="text-sm text-muted-foreground mt-1">Properties funded</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search properties, locations, or descriptions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger className="w-full lg:w-[200px]">
                      <SelectValue placeholder="Property Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="mixed">Mixed Use</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger className="w-full lg:w-[200px]">
                      <SelectValue placeholder="Price Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="under-100">Under 100 ETH</SelectItem>
                      <SelectItem value="100-200">100-200 ETH</SelectItem>
                      <SelectItem value="over-200">Over 200 ETH</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={yieldFilter} onValueChange={setYieldFilter}>
                    <SelectTrigger className="w-full lg:w-[200px]">
                      <SelectValue placeholder="Yield Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Yields</SelectItem>
                      <SelectItem value="under-6">Under 6%</SelectItem>
                      <SelectItem value="6-8">6-8%</SelectItem>
                      <SelectItem value="over-8">Over 8%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full lg:w-[200px]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yield">Highest Yield</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="progress">Most Funded</SelectItem>
                      <SelectItem value="time-left">Ending Soon</SelectItem>
                      <SelectItem value="recent">Recently Added</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{filteredProperties.length} properties found</span>
                    {(searchQuery || propertyTypeFilter !== "all" || priceRange !== "all" || yieldFilter !== "all") && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">View:</span>
                    <div className="flex rounded-lg border">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="rounded-r-none"
                      >
                        Grid
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-l-none"
                      >
                        List
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Properties Display */}
          {filteredProperties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Home className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No properties found</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  No properties match your current search criteria. Try adjusting your filters or search terms.
                </p>
                <Button onClick={clearFilters}>Clear All Filters</Button>
              </CardContent>
            </Card>
          ) : (
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }>
              {filteredProperties.map((property) => (
                <Card key={property.id} className={viewMode === "list" ? "overflow-hidden" : "group overflow-hidden border border-border/60 bg-white shadow-sm gap-0 p-0"}>
                  {viewMode === "list" ? (
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className="pl-6 w-56 h-32 flex">
                        <img
                          src={property.images[0]}
                          alt={property.name}
                          className="w-56 h-32 rounded-sm shrink-0 object-cover"
                          loading="lazy"
                        />
                        </div>
                        <div className="flex-1 pr-6 pl-8">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold">{property.name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {property.location}
                              </p>
                            </div>
                            <Badge variant={getRiskBadgeVariant(property.risk_level)}>
                              {property.risk_level} risk
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {property.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{property.token_price} ETH per token</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {property.annual_yield}% yield
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {property.available_tokens.toLocaleString()} of {property.total_tokens.toLocaleString()} tokens available
                              </div>
                            </div>
                          <Button size="sm" variant="outline" className="group/btn" asChild>
                          <Link to={`/properties/${property.id}`}>
                            <Coins className="w-4 h-4 group-hover/btn:text-primary transition-colors" />
                            {isEligible ? 'Invest Now' : 'View Details'}
                          </Link>
                          </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    <PropertyCard {...property} />
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Properties;
