import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, MapPin, Users, Coins, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/contexts/wallet-context";

interface PropertyCardProps {
  // Core required fields
  id: string | number;
  name?: string;
  title?: string; // Alternative to name for simplified display
  location: string;

  // Optional API fields (for detailed views)
  contract_address?: string;
  token_symbol?: string;
  description?: string;
  property_type?: 'residential' | 'commercial' | 'mixed';
  total_tokens?: number;
  available_tokens?: number;
  token_price?: number;
  total_value?: number;
  annual_yield?: number | string; // Allow string for simplified data
  risk_level?: 'low' | 'medium' | 'high';
  features?: string[];
  images?: string[];
  funding_progress?: number;
  minimum_investment?: number;
  status?: 'active' | 'funded' | 'cancelled' | 'archived';
  created_at?: Date;
  updated_at?: Date;
  weekly_volume?: number;
  avg_price_7d?: number;
  max_investors_7d?: number;

  // Simplified display fields (for landing page)
  image?: string;
  price?: string; // e.g. "$125"
  tokensAvailable?: number;
  totalTokens?: number;
  investors?: number;
  trending?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Check property compliance for current user
async function checkPropertyCompliance(propertyId: string, userId?: string): Promise<{ eligible: boolean; reason?: string }> {
  if (!userId) {
    return { eligible: false, reason: 'User not authenticated' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/compliance/${userId}`);
    if (!response.ok) {
      return { eligible: false, reason: 'Compliance check failed' };
    }

    const data = await response.json();
    return data.success ? data.data : { eligible: false, reason: 'Compliance check failed' };
  } catch (error) {
    return { eligible: false, reason: 'Network error' };
  }
}

export const PropertyCard = ({
  id,
  name,
  title,
  location,
  contract_address,
  token_symbol,
  description,
  property_type,
  total_tokens,
  available_tokens,
  token_price,
  total_value,
  annual_yield,
  risk_level,
  features,
  images,
  funding_progress,
  minimum_investment,
  status,
  created_at,
  updated_at,
  weekly_volume,
  avg_price_7d,
  max_investors_7d,
  // Simplified display fields
  image,
  price,
  tokensAvailable,
  totalTokens,
  investors,
  trending,
}: PropertyCardProps) => {
  const { state } = useWallet();

  // Determine if this is simplified display data or full API data
  const isSimplified = !contract_address && !token_symbol;

  // Use appropriate field names based on data structure
  const displayName = name || title || 'Property';
  const displayImages = images || (image ? [image] : []);
  const displayTokenPrice = token_price || (price ? parseFloat(price.replace('$', '')) : undefined);
  const displayAnnualYield = typeof annual_yield === 'string' ? parseFloat(annual_yield.replace('%', '')) : annual_yield;
  const displayTotalTokens = total_tokens || totalTokens;
  const displayAvailableTokens = available_tokens || tokensAvailable;
  const displayMaxInvestors = max_investors_7d || investors;

  // Check compliance only for full API data
  const { data: complianceStatus } = useQuery({
    queryKey: ['property-compliance', id, state.address],
    queryFn: () => checkPropertyCompliance(id.toString(), state.address as `0x${string}`),
    enabled: !!state.isConnected && !!state.address && !isSimplified,
  });

  const isEligible = complianceStatus?.eligible ?? true; // Default to true for simplified data
  const displayImage = displayImages?.[0] || "/placeholder-property.jpg";

  // Calculate ETH equivalent (mock calculation) with null check
  const ethPrice = displayTokenPrice ? displayTokenPrice * 0.000021 : 0;

  return (
    <Card className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 group">
      <Link to={`/properties/${id}`}>
        <div className="relative overflow-hidden aspect-[4/3]">
          <img
            src={displayImage}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            {risk_level && (
              <Badge variant="outline" className="bg-background/90">
                {risk_level} risk
              </Badge>
            )}
            {displayAnnualYield && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {displayAnnualYield}% yield
              </Badge>
            )}
            {trending && (
              <Badge variant="default" className="bg-orange-500">
                Trending
              </Badge>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {location}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {displayName}
            </h3>
            {displayTokenPrice && (
              <p className="text-2xl font-bold text-primary">
                ${displayTokenPrice.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  per token
                </span>
              </p>
            )}
            {price && !displayTokenPrice && (
              <p className="text-2xl font-bold text-primary">
                {price}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  per token
                </span>
              </p>
            )}
            {ethPrice > 0 && (
              <p className="text-sm text-muted-foreground">
                ≈ {ethPrice.toFixed(6)} ETH
              </p>
            )}
          </div>

          {displayTotalTokens && displayAvailableTokens && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available</span>
                <span className="font-semibold">
                  {displayAvailableTokens.toLocaleString()} / {displayTotalTokens.toLocaleString()}
                </span>
              </div>
              <Progress
                value={(displayAvailableTokens / displayTotalTokens) * 100}
                className="h-2"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-4 text-sm">
              {displayAnnualYield && (
                <div className="flex items-center gap-1 text-success">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">{displayAnnualYield}%</span>
                </div>
              )}
              {displayMaxInvestors && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{displayMaxInvestors}</span>
                </div>
              )}
            </div>
            <Button size="sm" variant="outline" className="group/btn">
              <Coins className="w-4 h-4 group-hover/btn:text-primary transition-colors" />
              {isEligible ? 'Invest' : 'View Details'}
            </Button>
          </div>

          {!isEligible && state.isConnected && (
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Additional verification required for this investment
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Link>
    </Card>
  );
};
