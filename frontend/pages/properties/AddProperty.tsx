import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/wallet-context";
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Home,
  Building,
  Factory,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

// Property creation interface matching backend expectations
interface PropertyCreateData {
  name: string;
  description: string;
  location: string;
  property_type: 'residential' | 'commercial' | 'industrial' | 'land';
  total_tokens: number;
  available_tokens: number;
  token_price: number;
  annual_yield: number;
  risk_level: 'low' | 'medium' | 'high';
  minimum_investment: number;
  features: string[];
  images: string[];
}

const AddProperty = () => {
  const navigate = useNavigate();
  const { state } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PropertyCreateData>({
    name: '',
    description: '',
    location: '',
    property_type: 'residential',
    total_tokens: 1000000,
    available_tokens: 1000000,
    token_price: 1.00,
    annual_yield: 6.5,
    risk_level: 'medium',
    minimum_investment: 100,
    features: [],
    images: []
  });

  const [newFeature, setNewFeature] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (field: keyof PropertyCreateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!state.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to upload images",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only JPEG, PNG, WebP, and GIF images are allowed",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      return;
    }

    // Add to uploading set
    const tempId = `temp-${Date.now()}`;
    setUploadingImages(prev => new Set(prev).add(tempId));

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      formDataUpload.append('userAddress', state.address);

      const response = await fetch(`/api/properties/images?temp=true`, {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Add uploaded image to the list
      setUploadedImages(prev => [...prev, data.data.fileUrl]);
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), data.data.fileUrl]
      }));

      toast({
        title: "Image Uploaded",
        description: "Image has been uploaded successfully",
      });

    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
    }
  };

  const removeImage = (imageUrl: string) => {
    setUploadedImages(prev => prev.filter(img => img !== imageUrl));
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter(img => img !== imageUrl)
    }));
  };

  const calculateTotalValue = () => {
    return formData.total_tokens * formData.token_price;
  };

  // Advanced analytics calculations
  const calculateBreakEvenPeriod = () => {
    const totalValue = calculateTotalValue();
    const annualYield = formData.annual_yield;
    const annualReturn = totalValue * (annualYield / 100);
    const monthlyReturn = annualReturn / 12;
    const minimumInvestment = formData.minimum_investment;

    if (monthlyReturn <= 0) return null;

    return Math.ceil(minimumInvestment / monthlyReturn);
  };

  const generateCashFlowProjection = () => {
    const years = 5;
    const totalValue = calculateTotalValue();
    const annualYield = formData.annual_yield / 100;
    const data = [];

    for (let year = 1; year <= years; year++) {
      const annualReturn = totalValue * annualYield;
      const cumulativeReturn = totalValue + (annualReturn * year);
      const roi = ((cumulativeReturn - totalValue) / totalValue) * 100;

      data.push({
        year: `Year ${year}`,
        annualReturn: Math.round(annualReturn),
        cumulativeReturn: Math.round(cumulativeReturn),
        roi: Math.round(roi * 100) / 100
      });
    }

    return data;
  };

  const generateRiskAnalysis = () => {
    const riskLevels = {
      low: { multiplier: 0.8, probability: 0.9 },
      medium: { multiplier: 0.7, probability: 0.75 },
      high: { multiplier: 0.5, probability: 0.6 }
    };

    const currentRisk = formData.risk_level as keyof typeof riskLevels;
    const riskData = riskLevels[currentRisk];

    return {
      optimistic: calculateTotalValue() * 1.2,
      expected: calculateTotalValue() * riskData.multiplier,
      pessimistic: calculateTotalValue() * 0.6,
      probability: riskData.probability * 100
    };
  };

  const calculateSharpeRatio = () => {
    const annualReturn = (formData.annual_yield / 100) * calculateTotalValue();
    const riskFreeRate = 0.03; // 3% risk-free rate
    const volatility = formData.risk_level === 'low' ? 0.1 :
                      formData.risk_level === 'medium' ? 0.2 : 0.3;

    return ((annualReturn / calculateTotalValue()) - riskFreeRate) / volatility;
  };

  const cashFlowConfig = {
    annualReturn: {
      label: "Annual Return",
      color: "hsl(var(--chart-1))",
    },
    cumulativeReturn: {
      label: "Cumulative Return",
      color: "hsl(var(--chart-2))",
    },
  };

  const riskAnalysisConfig = {
    optimistic: {
      label: "Optimistic",
      color: "hsl(var(--chart-1))",
    },
    expected: {
      label: "Expected",
      color: "hsl(var(--chart-2))",
    },
    pessimistic: {
      label: "Pessimistic",
      color: "hsl(var(--chart-3))",
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Advanced validation rules
    const validationErrors = validatePropertyForm(formData);
    
    if (validationErrors.length > 0) {
      // Display all validation errors
      validationErrors.forEach(error => {
        toast({
          title: "Validation Error",
          description: error,
          variant: "destructive"
        });
      });
      return;
    }

    if (!state.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to create a property",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/properties/manage/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          owner_address: state.address,
          contract_address: null, // Will be set after token deployment
          token_symbol: formData.name.substring(0, 3).toUpperCase(),
          total_value: calculateTotalValue(),
          available_tokens: formData.total_tokens,
          funding_progress: 0,
          status: 'active'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create property');
      }

      toast({
        title: "Success",
        description: "Property created successfully! Redirecting to property details...",
      });

      // Navigate to the newly created property
      navigate(`/properties/${data.data.id}`);

    } catch (error) {
      console.error('Property creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create property",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Advanced validation function
  const validatePropertyForm = (data: PropertyCreateData): string[] => {
    const errors: string[] = [];
    const totalValue = calculateTotalValue();

    // Basic required field validation
    if (!data.name?.trim()) {
      errors.push("Property name is required");
    } else if (data.name.length < 3) {
      errors.push("Property name must be at least 3 characters long");
    } else if (data.name.length > 100) {
      errors.push("Property name cannot exceed 100 characters");
    }

    if (!data.description?.trim()) {
      errors.push("Property description is required");
    } else if (data.description.length < 10) {
      errors.push("Property description must be at least 10 characters long");
    } else if (data.description.length > 2000) {
      errors.push("Property description cannot exceed 2000 characters");
    }

    if (!data.location?.trim()) {
      errors.push("Property location is required");
    } else if (data.location.length < 5) {
      errors.push("Property location must be at least 5 characters long");
    }

    // Numeric field validation
    if (!data.total_tokens || data.total_tokens < 1000) {
      errors.push("Total tokens must be at least 1,000");
    } else if (data.total_tokens > 100000000) {
      errors.push("Total tokens cannot exceed 100,000,000");
    }

    if (!data.token_price || data.token_price < 0.01) {
      errors.push("Token price must be at least $0.01");
    } else if (data.token_price > 10000) {
      errors.push("Token price cannot exceed $10,000");
    }

    if (!data.minimum_investment || data.minimum_investment < 10) {
      errors.push("Minimum investment must be at least $10");
    }

    // Business logic validation
    if (totalValue < 10000) {
      errors.push("Total property value must be at least $10,000");
    } else if (totalValue > 1000000000) {
      errors.push("Total property value cannot exceed $1,000,000,000");
    }

    // Cross-field validation
    if (data.minimum_investment && totalValue && data.minimum_investment > totalValue * 0.1) {
      errors.push("Minimum investment cannot exceed 10% of total property value");
    }

    // Yield validation based on risk level
    const expectedYields = {
      low: { min: 2, max: 5 },
      medium: { min: 4, max: 8 },
      high: { min: 6, max: 15 }
    };

    const riskLevel = data.risk_level as keyof typeof expectedYields;
    const yieldRange = expectedYields[riskLevel];

    if (data.annual_yield < yieldRange.min) {
      errors.push(`${data.risk_level} risk properties typically offer at least ${yieldRange.min}% annual yield`);
    } else if (data.annual_yield > yieldRange.max) {
      errors.push(`${data.risk_level} risk properties rarely offer more than ${yieldRange.max}% annual yield`);
    }

    // Market comparison validation
    if (data.annual_yield > 12) {
      errors.push("Annual yields above 12% are considered high risk and require additional due diligence");
    }

    // ERC-3643 compliance validation
    if (data.total_tokens % 1 !== 0) {
      errors.push("Total tokens must be a whole number for ERC-3643 compliance");
    }

    if (data.token_price * 1000000 % 1 !== 0) {
      errors.push("Token price precision is too high for ERC-3643 compliance");
    }

    // Investment accessibility validation
    const maxInvestmentRatio = 0.05; // Max 5% of total value for single investment
    const maxSingleInvestment = totalValue * maxInvestmentRatio;
    
    if (data.minimum_investment > maxSingleInvestment) {
      errors.push(`Minimum investment of $${data.minimum_investment.toLocaleString()} exceeds recommended maximum of $${maxSingleInvestment.toLocaleString()} (${(maxInvestmentRatio * 100).toFixed(1)}% of property value)`);
    }

    // Liquidity validation
    const recommendedLiquidityRatio = 0.2; // 20% should be liquid
    if (data.total_tokens > 0) {
      const liquidityRatio = data.available_tokens / data.total_tokens;
      if (liquidityRatio < recommendedLiquidityRatio) {
        errors.push(`Low liquidity: Only ${(liquidityRatio * 100).toFixed(1)}% of tokens are available. Consider increasing available tokens for better market liquidity.`);
      }
    }

    // Property type specific validation
    if (data.property_type === 'residential' && data.annual_yield > 8) {
      errors.push("Residential properties typically offer yields between 4-8%");
    }

    if (data.property_type === 'commercial' && data.annual_yield < 6) {
      errors.push("Commercial properties typically offer yields above 6%");
    }

    if (data.property_type === 'industrial' && data.annual_yield < 7) {
      errors.push("Industrial properties typically offer yields above 7%");
    }

    // Risk-adjusted pricing validation
    const riskMultipliers = {
      low: 1.2,
      medium: 1.0,
      high: 0.8
    };

    const riskMultiplier = riskMultipliers[riskLevel];
    const expectedPrice = (totalValue / data.total_tokens) * riskMultiplier;
    const actualPrice = data.token_price;

    if (actualPrice > expectedPrice * 1.5) {
      errors.push(`Token price seems high for ${data.risk_level} risk level. Consider reducing price or increasing total tokens.`);
    } else if (actualPrice < expectedPrice * 0.7) {
      errors.push(`Token price seems low for ${data.risk_level} risk level. Consider increasing price or reducing total tokens.`);
    }

    // Feature validation
    if (data.features && data.features.length > 20) {
      errors.push("Cannot have more than 20 property features");
    }

    if (data.features && data.features.some(feature => feature.length > 50)) {
      errors.push("Individual features cannot exceed 50 characters");
    }

    // Duplicate feature check
    if (data.features && new Set(data.features).size !== data.features.length) {
      errors.push("Duplicate features are not allowed");
    }

    return errors;
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case "residential": return <Home className="w-5 h-5 text-blue-500" />;
      case "commercial": return <Building className="w-5 h-5 text-green-500" />;
      case "industrial": return <Factory className="w-5 h-5 text-orange-500" />;
      default: return <MapPin className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "low": return "default";
      case "medium": return "secondary";
      case "high": return "destructive";
      default: return "outline";
    }
  };

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

              <div className="space-y-4">
                <h1 className="text-3xl font-bold">Create New Property</h1>
                <p className="text-muted-foreground">
                  Add a new tokenized property to the platform. All fields marked with * are required.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>
                    Essential details about your property
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Property Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Downtown Office Complex"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        placeholder="e.g., 123 Main St, New York, NY"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of the property including features, amenities, and investment potential..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="property_type">Property Type *</Label>
                      <Select value={formData.property_type} onValueChange={(value) => handleInputChange('property_type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4" />
                              Residential
                            </div>
                          </SelectItem>
                          <SelectItem value="commercial">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              Commercial
                            </div>
                          </SelectItem>
                          <SelectItem value="industrial">
                            <div className="flex items-center gap-2">
                              <Factory className="w-4 h-4" />
                              Industrial
                            </div>
                          </SelectItem>
                          <SelectItem value="land">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Land
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="risk_level">Risk Level *</Label>
                      <Select value={formData.risk_level} onValueChange={(value) => handleInputChange('risk_level', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <Badge variant="default">Low Risk</Badge>
                          </SelectItem>
                          <SelectItem value="medium">
                            <Badge variant="secondary">Medium Risk</Badge>
                          </SelectItem>
                          <SelectItem value="high">
                            <Badge variant="destructive">High Risk</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="annual_yield">Annual Yield (%)</Label>
                      <Input
                        id="annual_yield"
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        placeholder="6.5"
                        value={formData.annual_yield}
                        onChange={(e) => handleInputChange('annual_yield', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Token Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Token Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure the tokenized asset parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="total_tokens">Total Tokens *</Label>
                      <Input
                        id="total_tokens"
                        type="number"
                        min="1"
                        placeholder="1000000"
                        value={formData.total_tokens}
                        onChange={(e) => handleInputChange('total_tokens', parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="token_price">Token Price (USD) *</Label>
                      <Input
                        id="token_price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="1.00"
                        value={formData.token_price}
                        onChange={(e) => handleInputChange('token_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimum_investment">Minimum Investment *</Label>
                      <Input
                        id="minimum_investment"
                        type="number"
                        min="1"
                        placeholder="100"
                        value={formData.minimum_investment}
                        onChange={(e) => handleInputChange('minimum_investment', parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Property Value</p>
                        <p className="text-2xl font-bold">${calculateTotalValue().toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Annual Return</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${(calculateTotalValue() * formData.annual_yield / 100).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Property Features
                  </CardTitle>
                  <CardDescription>
                    Highlight key features and amenities of your property
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Swimming Pool, Gym, Parking"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <Button type="button" onClick={addFeature} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {formData.features.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {feature}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeFeature(feature)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Property Images
                  </CardTitle>
                  <CardDescription>
                    Upload images for your property (JPEG, PNG, WebP, GIF - max 5MB each)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Drag and Drop Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${
                      dragActive ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div className="space-y-2">
                      <p className={`text-lg font-medium ${
                        dragActive ? 'text-primary' : 'text-foreground'
                      }`}>
                        {dragActive ? 'Drop your image here' : 'Drag and drop your images here'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse files
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <Button type="button" variant="outline" className="mt-4">
                        Choose Files
                      </Button>
                    </label>
                  </div>

                  {/* Upload Status */}
                  {uploadingImages.size > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading {uploadingImages.size} image{uploadingImages.size > 1 ? 's' : ''}...
                    </div>
                  )}

                  {/* Uploaded Images Preview */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Uploaded Images</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {uploadedImages.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                              <img
                                src={imageUrl}
                                alt={`Uploaded image ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://placehold.co/200x200/e2e8f0/64748b?text=Image+${index + 1}`;
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(imageUrl)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadedImages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No images uploaded yet. Drag and drop or click to upload images.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Preview</CardTitle>
                  <CardDescription>How your property will appear to investors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">{formData.name || 'Property Name'}</div>
                      <Badge variant="outline">
                        {getPropertyTypeIcon(formData.property_type)}
                        <span className="ml-1 capitalize">{formData.property_type}</span>
                      </Badge>
                      <Badge variant={getRiskBadgeVariant(formData.risk_level)}>
                        {formData.risk_level} risk
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {formData.annual_yield}% yield
                      </Badge>
                    </div>

                    {formData.location && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {formData.location}
                      </p>
                    )}

                    {formData.description && (
                      <p className="text-muted-foreground">{formData.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="font-semibold">${calculateTotalValue().toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Token Price</p>
                        <p className="font-semibold">${formData.token_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tokens</p>
                        <p className="font-semibold">{formData.total_tokens.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Min Investment</p>
                        <p className="font-semibold">${formData.minimum_investment.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Analytics Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Advanced Analytics Preview
                  </CardTitle>
                  <CardDescription>
                    Financial projections and risk analysis based on your property configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Break-even Period</p>
                      <p className="text-2xl font-bold">
                        {calculateBreakEvenPeriod() ? `${calculateBreakEvenPeriod()} months` : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">Time to recover investment</p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-2xl font-bold">
                        {calculateSharpeRatio() ? calculateSharpeRatio()!.toFixed(2) : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">Risk-adjusted return</p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Success Probability</p>
                      <p className="text-2xl font-bold">{generateRiskAnalysis().probability.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Based on risk profile</p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">5-Year Projection</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${((calculateTotalValue() * (1 + formData.annual_yield / 100) ** 5)).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Projected value</p>
                    </div>
                  </div>

                  {/* Cash Flow Projection Chart */}
                  <div>
                    <h4 className="font-semibold mb-4">5-Year Cash Flow Projection</h4>
                    <ChartContainer config={cashFlowConfig} className="h-64">
                      <AreaChart data={generateCashFlowProjection()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="annualReturn"
                          stackId="1"
                          stroke="var(--color-annualReturn)"
                          fill="var(--color-annualReturn)"
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulativeReturn"
                          stackId="2"
                          stroke="var(--color-cumulativeReturn)"
                          fill="var(--color-cumulativeReturn)"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>

                  {/* Risk Analysis Chart */}
                  <div>
                    <h4 className="font-semibold mb-4">Risk-Adjusted Scenarios ({formData.risk_level} risk profile)</h4>
                    <ChartContainer config={riskAnalysisConfig} className="h-48">
                      <BarChart data={[generateRiskAnalysis()]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="scenario" hide />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="optimistic" fill="var(--color-optimistic)" />
                        <Bar dataKey="expected" fill="var(--color-expected)" />
                        <Bar dataKey="pessimistic" fill="var(--color-pessimistic)" />
                      </BarChart>
                    </ChartContainer>
                  </div>

                  {/* Investment Comparison */}
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <h4 className="font-semibold mb-4">Investment Comparison</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Traditional REITs</p>
                        <p className="text-2xl font-bold">4-6%</p>
                        <p className="text-xs text-muted-foreground">Average yield</p>
                      </div>
                      <div className="text-center border-x">
                        <p className="text-sm text-muted-foreground mb-2">Your Property</p>
                        <p className="text-2xl font-bold text-primary">{formData.annual_yield}%</p>
                        <p className="text-xs text-muted-foreground">Projected yield</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">High-Yield Bonds</p>
                        <p className="text-2xl font-bold">6-8%</p>
                        <p className="text-xs text-muted-foreground">Average yield</p>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm">
                        <span className={`font-semibold ${formData.annual_yield >= 6 ? 'text-green-600' : 'text-orange-600'}`}>
                          {formData.annual_yield >= 6 ? 'Above average' : 'Below average'} compared to market alternatives
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Performance Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Annual ROI:</span>
                          <span className="font-semibold">{formData.annual_yield}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Token Efficiency:</span>
                          <span className="font-semibold">
                            ${(calculateTotalValue() / formData.total_tokens).toFixed(2)} per token
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Market Cap:</span>
                          <span className="font-semibold">${calculateTotalValue().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Liquidity Ratio:</span>
                          <span className="font-semibold">
                            {((formData.available_tokens / formData.total_tokens) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Risk Assessment</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Risk Level:</span>
                          <span className="font-semibold capitalize">{formData.risk_level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Volatility Estimate:</span>
                          <span className="font-semibold">
                            {formData.risk_level === 'low' ? 'Low (10%)' :
                             formData.risk_level === 'medium' ? 'Medium (20%)' : 'High (30%)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Diversification:</span>
                          <span className="font-semibold">Single Property</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ERC-3643 Compliant:</span>
                          <span className="font-semibold text-green-600">Yes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link to="/properties">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Property...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Property
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddProperty;
