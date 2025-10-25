import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComplianceStatus } from "@/components/compliance-status";
import { usePropertyDetails } from "@/hooks/use-property-details";
import { usePropertyManagement } from "@/hooks/use-property-management";
import { useWallet } from "@/contexts/wallet-context";
import { InvestmentCalculator } from "@/components/investment-calculator";
import clsx from "clsx";
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
  Settings,
  FileText,
  Upload,
  MessageSquare,
  BarChart3,
  Plus,
  Edit3,
  Send,
} from "lucide-react";

// Property types for API data
interface Property {
  id: string;
  contract_address: string;
  token_symbol: string;
  name: string;
  description: string;
  location: string;
  property_type: 'residential' | 'commercial' | 'industrial' | 'land';
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

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { state } = useWallet();
  const [activeTab, setActiveTab] = useState("overview");
  const [mintAmount, setMintAmount] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);

  // Use the property details hook
  const {
    property,
    marketData,
    complianceStatus,
    ownerData,
    isLoading,
    error,
    isOwner,
    refetch
  } = usePropertyDetails(id || "");

  // Use property management hook for owner operations
  const {
    updateProperty,
    uploadDocument,
    mintTokens,
    sendInvestorMessage
  } = usePropertyManagement(id || "");

  // Handle form submissions
  const handleUpdateProperty = () => {
    // Get form values and submit
    const nameInput = document.querySelector('input[placeholder*="Property Name"]') as HTMLInputElement;
    const descTextarea = document.querySelector('textarea[placeholder*="Description"]') as HTMLTextAreaElement;

    if (nameInput?.value || descTextarea?.value) {
      updateProperty.mutate({
        name: nameInput?.value || property?.name,
        description: descTextarea?.value || property?.description,
      });
    }
  };

  const handleMintTokens = () => {
    if (mintAmount && parseInt(mintAmount) > 0) {
      mintTokens.mutate(parseInt(mintAmount));
      setMintAmount("");
    }
  };

  const handleSendMessage = () => {
    if (messageSubject && messageContent) {
      sendInvestorMessage.mutate({
        subject: messageSubject,
        message: messageContent,
        recipientType: 'all',
      });
      setMessageSubject("");
      setMessageContent("");
    }
  };

  // Early return for loading state
  if (isLoading) {
    return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Properties
                </Button>
              </div>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-8 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="h-24 bg-muted rounded animate-pulse" />
                      <div className="h-24 bg-muted rounded animate-pulse" />
                      <div className="h-24 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      </div>
    );
  }

  // Early return for error state
  if (error || !property) {
    return (
    <div className="flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <AlertCircle className="w-16 h-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Property Not Found</h2>
                <p className="text-muted-foreground">
                  {error?.message || "The property you're looking for doesn't exist."}
                </p>
              </div>
              <Button asChild>
                <Link to="/properties">Browse Properties</Link>
              </Button>
            </div>
          </div>
        </main>
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
      case "industrial": return <Building className="w-5 h-5 text-orange-500" />;
      default: return <MapPin className="w-5 h-5 text-gray-500" />;
    }
  };

  const fundingProgress = property.funding_progress;
  const tokensSold = property.total_tokens - property.available_tokens;
  const tokensAvailable = property.available_tokens;

  // Render main content
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full">
      <main className="pb-16 pt-6">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="mb-4 text-secondary-foreground">
              <Link to="/properties">
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Properties
              </Link>
            </Button>

            {/* Property Image Gallery */}
            {property.images && property.images.length > 0 ? (
              <Card className="mb-8 py-0">
                <CardContent className="flex-shrink-0 p-1">
                  <div className="relative">
                    {/* Main Image */}
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                      <img
                        src={property.images[selectedImage]}
                        alt={`${property.name} - Image ${selectedImage + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://placehold.co/1200x675/e2e8f0/64748b?text=${encodeURIComponent(property.name)}`;
                        }}
                      />
                    </div>

                    {/* Image Counter */}
                    <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                      {selectedImage + 1} / {property.images.length}
                    </div>

                    {/* Navigation Arrows */}
                    {property.images.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white"
                          onClick={() => setSelectedImage((prev) => (prev === 0 ? property.images.length - 1 : prev - 1))}
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white"
                          onClick={() => setSelectedImage((prev) => (prev === property.images.length - 1 ? 0 : prev + 1))}
                        >
                          <ArrowLeft className="w-5 h-5 rotate-180" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Gallery */}
                  {property.images.length > 1 && (
                    <div className="p-4 bg-muted/20">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {property.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`flex-shrink-0 relative rounded-lg overflow-hidden transition-all ${
                              selectedImage === index
                                ? 'ring-2 ring-primary ring-offset-2'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`${property.name} thumbnail ${index + 1}`}
                              className="w-24 h-16 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://placehold.co/96x64/e2e8f0/64748b?text=${index + 1}`;
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-8">
                <CardContent className="p-0">
                  <div className="aspect-video w-full bg-muted rounded-t-lg flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Home className="w-16 h-16 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">No images available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Property Header */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold">{property.name}</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {property.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant="outline">
                      {property.property_type}
                    </Badge>
                    <Badge variant={
                      property.risk_level === 'low' ? 'default' :
                      property.risk_level === 'medium' ? 'secondary' : 'destructive'
                    }>
                      {property.risk_level} risk
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {property.annual_yield}% yield
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                {/* Property Details Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mb-6">
                  <TabsList className={clsx("grid w-full grid-cols-3", isOwner && "grid-cols-4")}>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="financials">Financials</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    {isOwner && <TabsTrigger value="manage">Manage Property</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Property Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-muted-foreground">{property.description}</p>

                          <Separator />

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Property Type</p>
                              <p className="font-semibold capitalize">{property.property_type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Risk Level</p>
                              <p className="font-semibold capitalize">{property.risk_level}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Value</p>
                              <p className="font-semibold">${property.total_value ? property.total_value.toLocaleString() : '0'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Token Symbol</p>
                              <p className="font-semibold">{property.token_symbol}</p>
                            </div>
                          </div>

                          {property.features && property.features.length > 0 && (
                            <>
                              <Separator />
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Features</p>
                                <div className="flex flex-wrap gap-2">
                                  {property.features.map((feature, index) => (
                                    <Badge key={index} variant="secondary">{feature}</Badge>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Market Data</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {marketData ? (
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Current Price</span>
                                <span className="font-semibold">${marketData.currentPrice ? marketData.currentPrice.toFixed(2) : '0.00'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">24h Change</span>
                                <span className={`font-semibold ${marketData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {marketData.priceChange24h >= 0 ? '+' : ''}{marketData.priceChange24h ? marketData.priceChange24h.toFixed(2) : '0.00'}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">24h Volume</span>
                                <span className="font-semibold">${marketData.volume24h ? marketData.volume24h.toLocaleString() : '0'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Active Investors</span>
                                <span className="font-semibold">{marketData.investorsCount ? marketData.investorsCount : '0'}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Market data not available</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="financials" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Financial Overview</CardTitle>
                        <CardDescription>Detailed financial performance and projections</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Detailed financial analytics coming soon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Property Documents</CardTitle>
                        <CardDescription>Legal documents, appraisals, and certificates</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Document management system coming soon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Owner Management Panel */}
                  {isOwner && (
                    <TabsContent value="manage" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Property Management */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Settings className="w-5 h-5" />
                              Property Management
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Property Name</label>
                              <Input defaultValue={property.name} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Description</label>
                              <Textarea defaultValue={property.description} rows={3} />
                            </div>
                            <Button
                              className="w-full"
                              onClick={handleUpdateProperty}
                              disabled={updateProperty.isPending}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              {updateProperty.isPending ? 'Updating...' : 'Update Property'}
                            </Button>
                          </CardContent>
                        </Card>

                        {/* Token Management */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Coins className="w-5 h-5" />
                              Token Management
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Mint Additional Tokens</label>
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                value={mintAmount}
                                onChange={(e) => setMintAmount(e.target.value)}
                              />
                            </div>
                            <Button
                              className="w-full"
                              onClick={handleMintTokens}
                              disabled={mintTokens.isPending || !mintAmount}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {mintTokens.isPending ? 'Minting...' : 'Mint Tokens'}
                            </Button>

                            {ownerData && (
                              <div className="pt-4 border-t space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Total Investors</span>
                                  <span className="font-semibold">{ownerData.investorCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Total Raised</span>
                                  <span className="font-semibold">${ownerData.totalRaised ? ownerData.totalRaised.toLocaleString() : '0'}</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Document Upload */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Upload className="w-5 h-5" />
                              Document Management
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground mb-2">
                                Drag and drop files here, or click to browse
                              </p>
                              <Button variant="outline" size="sm">
                                Choose Files
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                            </p>
                          </CardContent>
                        </Card>

                        {/* Investor Communication */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <MessageSquare className="w-5 h-5" />
                              Investor Communication
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Subject</label>
                              <Input
                                placeholder="Message subject"
                                value={messageSubject}
                                onChange={(e) => setMessageSubject(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Message</label>
                              <Textarea
                                placeholder="Type your message to investors..."
                                rows={4}
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                              />
                            </div>
                            <Button
                              className="w-full"
                              onClick={handleSendMessage}
                              disabled={sendInvestorMessage.isPending || !messageSubject || !messageContent}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {sendInvestorMessage.isPending ? 'Sending...' : 'Send to All Investors'}
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
                {/* Compliance Status */}
                <ComplianceStatus propertyId={property.id} userId={state.address || ''} />
              </div>

              {/* Investment Sidebar */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Investment Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-left">
                      <div className="text-2xl font-bold">${property.token_price ? property.token_price.toFixed(2) : '0.00'}</div>
                      <div className="text-sm text-muted-foreground">per token</div>
                      {marketData && (
                        <div className="text-sm text-muted-foreground">
                          Market: ${marketData.currentPrice ? marketData.currentPrice.toFixed(2) : '0.00'}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Available Tokens</span>
                        <span className="font-semibold">
                          {property.available_tokens ? property.available_tokens.toLocaleString() : '0'} / {property.total_tokens ? property.total_tokens.toLocaleString() : '0'}
                        </span>
                      </div>
                      <Progress value={(property.available_tokens / property.total_tokens) * 100} className="h-2" />
                    </div>

                    {/* Investment Calculator */}
                    <InvestmentCalculator
                    userId={state.address || ''}
                    property={{
                      id: property.id,
                      name: property.name,
                      tokenPrice: property.token_price,
                      annualYield: property.annual_yield,
                      minimumInvestment: property.minimum_investment,
                      riskLevel: property.risk_level,
                    }} />

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {complianceStatus?.eligible ? (
                        <Button className="w-full" size="lg">
                          <Coins className="w-4 h-4 mr-2" />
                          Invest Now
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" size="lg">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Contact Owner
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
    </div>
  );
};

export default PropertyDetails;
