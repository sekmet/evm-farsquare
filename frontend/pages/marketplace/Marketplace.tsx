import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Search, Filter, RefreshCw, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Types for API data
interface MarketplaceListing {
  id: string;
  property_id: string;
  seller_address: string;
  listing_price: number;
  token_quantity: number;
  available_quantity: number;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
  property_name?: string;
  location?: string;
  property_type?: string;
  annual_yield?: number;
  risk_level?: string;
  primary_image?: string;
}

interface MarketStats {
  volume24h: string;
  activeListings: number;
  avgTokenPrice: string;
  totalTrades: number;
  volumeChange: number;
  listingsChange: number;
  priceChange: number;
  tradesChange: number;
}

interface TradeHistory {
  id: string;
  property: string;
  buyer: string;
  seller: string;
  price: string;
  tokens: number;
  time: string;
  timestamp: number;
}

interface UserPortfolio {
  totalValue: string;
  totalTokens: number;
  properties: Array<{
    name: string;
    tokens: number;
    value: string;
    yield: string;
  }>;
}

const Marketplace = () => {
  const [activeTab, setActiveTab] = useState("listings");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("yield");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // API state
  const [marketStats, setMarketStats] = useState<MarketStats>({
    volume24h: "$2.4M",
    activeListings: 0,
    avgTokenPrice: "52.3 ETH",
    totalTrades: 0,
    volumeChange: 0,
    listingsChange: 0,
    priceChange: 0,
    tradesChange: 0,
  });

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [trades, setTrades] = useState<TradeHistory[]>([]);
  const [portfolio, setPortfolio] = useState<UserPortfolio>({
    totalValue: "0 ETH",
    totalTokens: 0,
    properties: [],
  });

  // Filter and sort listings based on user preferences
  const filteredListings = useMemo(() => {
    let filtered = listings.filter((listing) => {
      const matchesSearch = (listing.property_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
                          (listing.location?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      const matchesType = propertyTypeFilter === "all" || listing.property_type === propertyTypeFilter;

      return matchesSearch && matchesType;
    });

    // Sort listings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "yield":
          return (b.annual_yield || 0) - (a.annual_yield || 0);
        case "price-low":
          return a.listing_price - b.listing_price;
        case "price-high":
          return b.listing_price - a.listing_price;
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [listings, searchQuery, propertyTypeFilter, sortBy]);

  // Fetch marketplace data from API
  const fetchMarketData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch marketplace listings
      const listingsResponse = await fetch(`${API_BASE_URL}/api/marketplace/listings`);
      if (listingsResponse.ok) {
        const listingsData = await listingsResponse.json();
        if (listingsData.success) {
          setListings(listingsData.data);
        }
      }

      // Fetch market statistics (mock for now)
      setMarketStats(prev => ({
        ...prev,
        activeListings: listings.length,
      }));

      setLastUpdate(new Date());
    } catch (err) {
      setError("Failed to load market data. Please try again.");
      console.error("Market data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize data fetching
  useEffect(() => {
    fetchMarketData();

    // Set up periodic updates (every 30 seconds)
    const interval = setInterval(fetchMarketData, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastUpdate(new Date());
    } catch (err) {
      setError("Failed to refresh data.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hour${Math.floor(diff / 3600000) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 86400000)} day${Math.floor(diff / 86400000) > 1 ? 's' : ''} ago`;
  };

  if (isLoading && !lastUpdate) {
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
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Marketplace</h1>
                <p className="text-muted-foreground text-lg">
                  Buy and sell property tokens on the secondary market
                </p>
              </div>
              <div className="flex items-center gap-3">
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

          {/* Market Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">24h Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketStats.volume24h}</div>
                <div className={`flex items-center gap-1 text-sm mt-1 ${marketStats.volumeChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {marketStats.volumeChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{Math.abs(marketStats.volumeChange)}%</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketStats.activeListings.toLocaleString()}</div>
                <div className={`flex items-center gap-1 text-sm mt-1 ${marketStats.listingsChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {marketStats.listingsChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{Math.abs(marketStats.listingsChange)}%</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Token Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketStats.avgTokenPrice}</div>
                <div className={`flex items-center gap-1 text-sm mt-1 ${marketStats.priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {marketStats.priceChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{Math.abs(marketStats.priceChange)}%</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketStats.totalTrades.toLocaleString()}</div>
                <div className={`flex items-center gap-1 text-sm mt-1 ${marketStats.tradesChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {marketStats.tradesChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{Math.abs(marketStats.tradesChange)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Marketplace Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="listings">Active Listings</TabsTrigger>
              <TabsTrigger value="trades">Recent Trades</TabsTrigger>
              <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
            </TabsList>

            <TabsContent value="listings" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search properties..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                      <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Property Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="mixed">Mixed Use</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yield">Highest Yield</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="recent">Recently Listed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Listings Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Property Tokens</CardTitle>
                  <CardDescription>
                    {filteredListings.length} properties found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      ))}
                    </div>
                  ) : filteredListings.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No properties found matching your criteria.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Yield</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredListings.map((listing) => (
                          <TableRow key={listing.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{listing.property_name}</div>
                                <div className="text-sm text-muted-foreground font-mono">
                                  {listing.seller_address.slice(0, 8)}...{listing.seller_address.slice(-8)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{listing.location}</TableCell>
                            <TableCell className="font-medium">{listing.listing_price.toLocaleString()} ETH</TableCell>
                            <TableCell>
                              <div>
                                <div>{listing.available_quantity.toLocaleString()} tokens</div>
                                <div className="text-sm text-muted-foreground">
                                  of {listing.token_quantity.toLocaleString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {listing.annual_yield}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {listing.property_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" asChild>
                                <Link to={`/marketplace/${listing.id}`}>
                                  Buy Tokens
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trades" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trade History</CardTitle>
                  <CardDescription>Latest property token transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Tokens</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trades.map((trade) => (
                          <TableRow key={trade.id}>
                            <TableCell className="font-medium">{trade.property}</TableCell>
                            <TableCell className="font-mono text-sm">{trade.buyer}</TableCell>
                            <TableCell className="font-mono text-sm">{trade.seller}</TableCell>
                            <TableCell>{trade.price}</TableCell>
                            <TableCell>{trade.tokens.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{formatTimeAgo(trade.timestamp)}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="portfolio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Overview</CardTitle>
                  <CardDescription>Your property token investments</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-8 w-3/4" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-8 w-3/4" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center p-6 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Total Portfolio Value</div>
                          <div className="text-3xl font-bold">{portfolio.totalValue}</div>
                        </div>
                        <div className="text-center p-6 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Total Tokens Held</div>
                          <div className="text-3xl font-bold">{portfolio.totalTokens.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Your Properties</h3>
                        {portfolio.properties.map((property, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <div className="font-medium">{property.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {property.tokens} tokens
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{property.value}</div>
                              <Badge variant="outline" className="mt-1">
                                {property.yield} yield
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
