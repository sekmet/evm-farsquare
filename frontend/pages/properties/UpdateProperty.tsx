import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { usePropertyDetails } from "@/hooks/use-property-details";
import { usePropertyManagement } from "@/hooks/use-property-management";
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
  Loader2,
  Save
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

// Property update interface matching backend expectations
interface PropertyUpdateData {
  name?: string;
  description?: string;
  location?: string;
  property_type?: 'residential' | 'commercial' | 'industrial' | 'land';
  total_tokens?: number;
  token_price?: number;
  annual_yield?: number;
  risk_level?: 'low' | 'medium' | 'high';
  minimum_investment?: number;
  features?: string[];
  images?: string[];
}

const UpdateProperty = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PropertyUpdateData>({});
  const [newFeature, setNewFeature] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Use property details hook to load existing data
  const {
    property,
    isLoading: isPropertyLoading,
    error,
    refetch
  } = usePropertyDetails(id || "");

  // Use property management hook for updates
  const { updateProperty } = usePropertyManagement(id || "");

  // Initialize form data when property loads
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        description: property.description,
        location: property.location,
        property_type: property.property_type,
        total_tokens: property.total_tokens,
        token_price: property.token_price,
        annual_yield: property.annual_yield,
        risk_level: property.risk_level,
        minimum_investment: property.minimum_investment,
        features: property.features || [],
        images: property.images || []
      });
      setUploadedImages(property.images || []);
      setImageUrls(property.images || []);
    }
  }, [property]);

  const handleInputChange = (field: keyof PropertyUpdateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.features?.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.filter(f => f !== feature) || []
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

      const response = await fetch(`/api/properties/${id}/images`, {
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
    const tokens = formData.total_tokens || property?.total_tokens || 0;
    const price = formData.token_price || property?.token_price || 0;
    return tokens * price;
  };

  const calculateBreakEvenPeriod = () => {
    const totalValue = calculateTotalValue();
    const annualYield = (formData.annual_yield || property?.annual_yield || 0);
    const annualReturn = totalValue * (annualYield / 100);
    const monthlyReturn = annualReturn / 12;
    const minimumInvestment = (formData.minimum_investment || property?.minimum_investment || 0);

    if (monthlyReturn <= 0) return null;

    return Math.ceil(minimumInvestment / monthlyReturn);
  };

  const generateCashFlowProjection = () => {
    const years = 5;
    const totalValue = calculateTotalValue();
    const annualYield = (formData.annual_yield || property?.annual_yield || 0) / 100;
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
    const riskLevel = formData.risk_level || property?.risk_level || 'medium';
    const riskLevels = {
      low: { multiplier: 0.8, probability: 0.9 },
      medium: { multiplier: 0.7, probability: 0.75 },
      high: { multiplier: 0.5, probability: 0.6 }
    };

    const riskData = riskLevels[riskLevel as keyof typeof riskLevels];

    return {
      optimistic: calculateTotalValue() * 1.2,
      expected: calculateTotalValue() * riskData.multiplier,
      pessimistic: calculateTotalValue() * 0.6,
      probability: riskData.probability * 100
    };
  };

  const calculateSharpeRatio = () => {
    const annualReturn = ((formData.annual_yield || property?.annual_yield || 0) / 100) * calculateTotalValue();
    const riskFreeRate = 0.03; // 3% risk-free rate
    const riskLevel = formData.risk_level || property?.risk_level || 'medium';
    const volatility = riskLevel === 'low' ? 0.1 :
                      riskLevel === 'medium' ? 0.2 : 0.3;

    return ((annualReturn / calculateTotalValue()) - riskFreeRate) / volatility;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Property name is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.description?.trim()) {
      toast({
        title: "Validation Error",
        description: "Property description is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.location?.trim()) {
      toast({
        title: "Validation Error",
        description: "Property location is required",
        variant: "destructive"
      });
      return;
    }

    if (!state.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to update the property",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateProperty.mutateAsync({
        userId: state.address,
        updates: formData
      });

      toast({
        title: "Success",
        description: "Property updated successfully!",
      });

      // Refetch property data to show updated info
      refetch();

    } catch (error) {
      console.error('Property update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update property",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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

  // Early return for loading state
  if (isPropertyLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-4xl">
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
        <div className="w-full max-w-4xl">
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-6">
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <AlertCircle className="w-16 h-16 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-semibold">Property Not Found</h2>
                  <p className="text-muted-foreground">
                    {error?.message || "The property you're trying to update doesn't exist or you don't have permission to edit it."}
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

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        <main className="pb-16 pt-6">
          <div className="container mx-auto px-6">
            {/* Header */}
            <div className="mb-6">
              <Button variant="ghost" size="sm" asChild className="mb-4 text-secondary-foreground">
                <Link to={`/properties/${id}`}>
                  <ArrowLeft className="w-5 h-5 mr-1" />
                  Back to Property Details
                </Link>
              </Button>

              <div className="space-y-4">
                <h1 className="text-3xl font-bold">Update Property</h1>
                <p className="text-muted-foreground">
                  Edit the details of your tokenized property. Changes will be reflected immediately.
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
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        placeholder="e.g., 123 Main St, New York, NY"
                        value={formData.location || ''}
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
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="property_type">Property Type *</Label>
                      <Select
                        value={formData.property_type || property.property_type}
                        onValueChange={(value) => handleInputChange('property_type', value)}
                      >
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
                      <Select
                        value={formData.risk_level || property.risk_level}
                        onValueChange={(value) => handleInputChange('risk_level', value)}
                      >
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
                        value={formData.annual_yield || property.annual_yield || ''}
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
                        value={formData.total_tokens || property.total_tokens || ''}
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
                        value={formData.token_price || property.token_price || ''}
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
                        value={formData.minimum_investment || property.minimum_investment || ''}
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
                          ${(calculateTotalValue() * (formData.annual_yield || property.annual_yield || 0) / 100).toLocaleString()}
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

                  {formData.features && formData.features.length > 0 && (
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
                  <CardDescription>How your property will appear to investors after update</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">{formData.name || property.name}</div>
                      <Badge variant="outline">
                        {getPropertyTypeIcon(formData.property_type || property.property_type)}
                        <span className="ml-1 capitalize">{formData.property_type || property.property_type}</span>
                      </Badge>
                      <Badge variant={getRiskBadgeVariant(formData.risk_level || property.risk_level)}>
                        {formData.risk_level || property.risk_level} risk
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {formData.annual_yield || property.annual_yield}% yield
                      </Badge>
                    </div>

                    {(formData.location || property.location) && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {formData.location || property.location}
                      </p>
                    )}

                    {(formData.description || property.description) && (
                      <p className="text-muted-foreground">{formData.description || property.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="font-semibold">${calculateTotalValue().toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Token Price</p>
                        <p className="font-semibold">${(formData.token_price || property.token_price || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tokens</p>
                        <p className="font-semibold">{(formData.total_tokens || property.total_tokens || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Min Investment</p>
                        <p className="font-semibold">${(formData.minimum_investment || property.minimum_investment || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link to={`/properties/${id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading || updateProperty.isPending}>
                  {isLoading || updateProperty.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating Property...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Property
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

export default UpdateProperty;
