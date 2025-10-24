import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
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
  ShoppingCart,
} from "lucide-react";

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
  created_at: string;
  updated_at: string;
  weekly_volume?: number;
  avg_price_7d?: number;
  max_investors_7d?: number;
}

const MarketplaceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(1);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contract integration functions
  const purchaseTokens = async () => {
    if (!listing) return;

    try {
      // Execute contract call to buy tokens
      const contractCall = {
        contractAddress: listing.property_id,
        functionName: 'buy-tokens',
        parameters: [
          { type: 'uint', value: purchaseQuantity },
          { type: 'uint', value: listing.listing_price * purchaseQuantity }
        ],
        description: `Purchased ${purchaseQuantity} tokens`
      };

      // This would integrate with wallet signing and contract calls
      const response = await fetch(`${API_BASE_URL}/api/contracts/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: contractCall.contractAddress,
          functionName: contractCall.functionName,
          parameters: contractCall.parameters
        })
      });

      if (response.ok) {
        // Show success message and refresh data
        alert(`Successfully purchased ${purchaseQuantity} tokens!`);
        // Refresh listing data
        fetchListingDetails();
      }
    } catch (error) {
      console.error('Failed to purchase tokens:', error);
      alert('Failed to purchase tokens. Please try again.');
    }
  };

  const fetchListingDetails = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch marketplace listing details
      const listingResponse = await fetch(`${API_BASE_URL}/api/marketplace/listings/${id}`);

      if (!listingResponse.ok) {
        throw new Error(`HTTP error! status: ${listingResponse.status}`);
      }

      const listingData = await listingResponse.json();

      if (listingData.success) {
        setListing(listingData.data);

        // Fetch property details if we have a property_id
        if (listingData.data.property_id) {
          const propertyResponse = await fetch(`${API_BASE_URL}/api/properties/${listingData.data.property_id}`);
          if (propertyResponse.ok) {
            const propertyData = await propertyResponse.json();
            if (propertyData.success) {
              setProperty(propertyData.data);
            }
          }
        }
      } else {
        throw new Error(listingData.error || 'Failed to fetch listing');
      }
    } catch (err) {
      setError("Failed to load marketplace listing details");
      console.error("Listing fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListingDetails();
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

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background">

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <AlertCircle className="w-16 h-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Listing Not Found</h2>
                <p className="text-muted-foreground">
                  {error || "The marketplace listing you're looking for doesn't exist."}
                </p>
              </div>
              <Button asChild>
                <Link to="/marketplace">Browse Marketplace</Link>
              </Button>
            </div>
          </div>
        </main>
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

  const isExpired = new Date(listing.expires_at) < new Date();
  const isActive = listing.status === 'active' && !isExpired;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link to="/marketplace" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Marketplace
              </Link>
            </Button>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "Active" : listing.status}
                  </Badge>
                  {isExpired && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                  {listing.property_type && getPropertyTypeIcon(listing.property_type)}
                  <Badge variant="outline">
                    {listing.property_type}
                  </Badge>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-3">{listing.property_name}</h1>
                <p className="text-muted-foreground text-lg flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5" />
                  {listing.location}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">{listing.listing_price.toLocaleString()} ETH</p>
                    <p className="text-sm text-muted-foreground">per token</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Coins className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{listing.available_quantity.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">tokens available</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">
                      {isExpired ? 'Expired' : Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                    </p>
                    <p className="text-sm text-muted-foreground">days left</p>
                  </div>
                </div>
              </div>

              <div className="lg:w-80">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Purchase Tokens
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Quantity</label>
                        <input
                          type="number"
                          className="w-full mt-1 p-2 border rounded-md"
                          placeholder="Enter quantity"
                          min="1"
                          max={listing.available_quantity}
                          step="1"
                        />
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Total Cost</div>
                        <div className="text-lg font-semibold">0 ETH</div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!isActive}
                      onClick={purchaseTokens}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {isActive ? `Buy ${purchaseQuantity} Tokens` : 'Listing Unavailable'}
                    </Button>

                    {!isActive && (
                      <p className="text-sm text-muted-foreground text-center">
                        {isExpired ? 'This listing has expired' : 'This listing is no longer available'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Property & Listing Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle>Property Information</CardTitle>
                <CardDescription>Details about the underlying property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {property ? (
                  <>
                    <p className="text-sm leading-relaxed">{property.description}</p>

                    <div className="space-y-3">
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
                        <span className="text-sm text-muted-foreground">Annual Yield</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {property.annual_yield}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Value</span>
                        <span className="font-medium">${property.total_value.toLocaleString()}</span>
                      </div>
                    </div>

                    {property.features.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Property Features</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {property.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Property details not available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Listing Details</CardTitle>
                <CardDescription>Information about this marketplace listing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Seller Address</span>
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-mono text-xs">
                      {listing.seller_address.slice(0, 8)}...{listing.seller_address.slice(-8)}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Listing Price</span>
                    <span className="font-medium">{listing.listing_price.toLocaleString()} ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Available Tokens</span>
                    <span className="font-medium">{listing.available_quantity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Tokens</span>
                    <span className="font-medium">{listing.token_quantity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Listed On</span>
                    <span className="font-medium">{new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expires On</span>
                    <span className="font-medium">{new Date(listing.expires_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Active" : listing.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Calculator */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Calculator</CardTitle>
              <CardDescription>Calculate your investment and potential returns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Quantity to Buy</label>
                    <input
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      placeholder="Enter quantity"
                      min="1"
                      max={listing.available_quantity}
                      step="1"
                    />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Investment</div>
                    <div className="text-lg font-semibold">0 ETH</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-sm text-green-700 dark:text-green-300 mb-1">Est. Annual Return</div>
                    <div className="text-lg font-semibold text-green-600">0 ETH</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Ownership Percentage</div>
                    <div className="text-lg font-semibold text-blue-600">0%</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">Property Value</div>
                    <div className="text-lg font-semibold text-purple-600">
                      {property ? `$${(property.total_value / 1000000).toFixed(1)}M` : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-sm text-orange-700 dark:text-orange-300 mb-1">Your Share</div>
                    <div className="text-lg font-semibold text-orange-600">$0</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceDetails;
