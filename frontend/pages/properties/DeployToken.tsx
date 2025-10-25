import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/wallet-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Copy, ChevronDown } from 'lucide-react';
import { usePropertyDetails } from '@/hooks/use-property-details';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createSecureApiClientFromEnv } from '@/lib/secure-api';

interface TokenDeploymentData {
  // Token basic info
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;

  // Compliance settings
  countryRestrictions: string[];
  maxBalance: number;
  maxHolders: number;
  timeRestrictions: boolean;

  // Advanced settings
  claimTopics: number[];
  trustedIssuers: string[];
  complianceModules: string[];

  // Property linkage
  propertyId: string;

  // Token type
  instrumentType: string;
  baseCurrency: string;
}

interface TokenDeploymentParams {
  tokenData: TokenDeploymentData;
  propertyId: string;
  userId: string;
}

const DeployToken = () => {
  const { id: propertyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useWallet();
  const { toast } = useToast();

  // Initialize secure API client
  const secureApi = createSecureApiClientFromEnv();

  // Step management
  const [currentStep, setCurrentStep] = useState<'form' | 'confirmation'>('form');

  // Form data
  const [formData, setFormData] = useState<TokenDeploymentData>({
    name: '',
    symbol: '',
    decimals: 18,
    totalSupply: 1000000,
    instrumentType: 'EQUITY',
    baseCurrency: 'PYUSD',
    countryRestrictions: ['840', '826', '756'], // USA, UK, Switzerland
    maxBalance: 100000000000000000000000, // 100k tokens
    maxHolders: 1000,
    timeRestrictions: false,
    claimTopics: [1, 2, 7], // KYC, AML, Country
    trustedIssuers: [],
    complianceModules: ['CountryRestrictions', 'MaxBalance', 'MaxHolders'],
    propertyId: propertyId || ''
  });

  // Property details
  const { property, isLoading: isPropertyLoading } = usePropertyDetails(propertyId || '');

  // Advanced settings expanded state
  const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = useState(false);

  // Copy address function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard"
    });
  };

  // Form validation
  const validateForm = () => {
    if (!formData.name.trim()) return false;
    if (!formData.symbol.trim()) return false;
    if (formData.symbol.length > 32) return false;
    if (formData.decimals < 0 || formData.decimals > 18) return false;
    if (formData.totalSupply <= 0) return false;
    if (!propertyId) return false;
    return true;
  };

  // Token deployment mutation
  const deployToken = useMutation({
    mutationFn: async (params: TokenDeploymentParams) => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }

      // Use secure API client to deploy token
      const response = await secureApi.deployToken(propertyId, params.tokenData);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to deploy token');
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Token Deployed Successfully",
        description: `Token deployed at ${data.tokenAddress}`,
      });

      // Navigate to property details
      navigate(`/properties/${propertyId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields correctly",
        variant: "destructive"
      });
      return;
    }

    if (!state.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to deploy tokens",
        variant: "destructive"
      });
      return;
    }

    setCurrentStep('confirmation');
  };

  // Handle deployment
  const handleDeploy = () => {
    if (!state.address || !propertyId) return;

    deployToken.mutate({
      tokenData: formData,
      propertyId,
      userId: state.address
    });
  };

  // Generate token symbol from name if empty
  useEffect(() => {
    if (!formData.symbol && formData.name) {
      const generatedSymbol = formData.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 8);
      setFormData(prev => ({ ...prev, symbol: generatedSymbol }));
    }
  }, [formData.name]);

  if (isPropertyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
          <p className="mb-4">The property you're trying to deploy a token for doesn't exist.</p>
          <Button asChild>
            <Link to="/properties">Back to Properties</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Form step
  if (currentStep === 'form') {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-full">
          <main className="pb-16 pt-6">
            <div className="container mx-auto px-6">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/properties/${propertyId}`)}
                  className="mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Property
                </Button>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Deploy ERC-3643 Property Token</h1>
                <p className="text-muted-foreground p-2">
                  Deploy a compliant security token for property: <strong>{property.name}</strong>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Token Overview Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#7B3FE4] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">T</span>
                      </div>
                      Token Overview
                    </CardTitle>
                    <CardDescription>
                      Configure your security token basic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Token Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., FarSquare Property Token"
                            maxLength={32}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="symbol">Token Symbol *</Label>
                          <Input
                            id="symbol"
                            value={formData.symbol}
                            onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                            placeholder="e.g., FSQ"
                            maxLength={32}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="decimals">Decimals</Label>
                          <Input
                            id="decimals"
                            type="number"
                            value={formData.decimals}
                            onChange={(e) => setFormData(prev => ({ ...prev, decimals: parseInt(e.target.value) || 18 }))}
                            min={0}
                            max={18}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="totalSupply">Total Supply</Label>
                          <Input
                            id="totalSupply"
                            type="number"
                            value={formData.totalSupply}
                            onChange={(e) => setFormData(prev => ({ ...prev, totalSupply: parseInt(e.target.value) || 0 }))}
                            min={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="instrumentType">Instrument Type</Label>
                          <Select name="instrumentType">
                            <SelectTrigger>
                              <SelectValue defaultValue={formData.instrumentType} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EQUITY">EQUITY</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="baseCurrency">Base Currency</Label>
                          <Select name="baseCurrency">
                            <SelectTrigger>
                              <SelectValue defaultValue={formData.baseCurrency} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PYUSD">PYUSD</SelectItem>
                              <SelectItem value="USDC">USDC</SelectItem>
                              <SelectItem value="EURC">EURC</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Token name</p>
                        <p className="font-medium">{formData.name || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Token symbol</p>
                        <p className="font-medium">{formData.symbol || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Decimals</p>
                        <p className="font-medium">{formData.decimals}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Instrument type</p>
                        <p className="font-medium">{formData.instrumentType}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Base currency</p>
                        <p className="font-medium">{formData.baseCurrency}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Advanced Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setAdvancedSettingsExpanded(!advancedSettingsExpanded)}
                    >
                      <span>Advanced settings</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${advancedSettingsExpanded ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>

                  {advancedSettingsExpanded && (
                    <CardContent className="space-y-6">
                      {/* Token Ownership */}
                      <div className="flex items-center justify-between py-4 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">👤</span>
                          </div>
                          <div>
                            <p className="font-medium">Token ownership</p>
                            <p className="text-sm text-muted-foreground">
                              {state.address ? `${state.address.slice(0, 6)}...${state.address.slice(-4)}` : 'Connect wallet first'}
                            </p>
                          </div>
                        </div>
                        {state.address && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(state.address!)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* Claims */}
                      <div className="flex items-center justify-between py-4 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">📋</span>
                          </div>
                          <div>
                            <p className="font-medium">Claims</p>
                            <p className="text-sm text-muted-foreground">
                              Specific KYC status — Default
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5" />
                      </div>

                      {/* Compliance */}
                      <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">⚖️</span>
                          </div>
                          <div>
                            <p className="font-medium">Compliance</p>
                            <p className="text-sm text-muted-foreground">
                              No rules — Default
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-[#7B3FE4] hover:bg-[#6a32d1] text-white px-8 py-3 font-semibold"
                  >
                    Review Token Configuration
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Confirmation step
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full">
        <main className="pb-16 pt-6">
          <div className="container mx-auto px-6">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
              <div>
              <Button
                variant="ghost"
                onClick={() => setCurrentStep('form')}
                className="mb-8"
              >
              <ArrowLeft className="w-4 h-4" />
              Back to Form
              </Button>
              <h1 className="text-3xl font-bold">{formData.symbol}</h1>
              <p className="text-muted-foreground">
                {formData.name}
              </p>
              </div>
              {/* Right Column - Deploy Button */}
              <Button
                onClick={handleDeploy}
                disabled={deployToken.isPending}
                className="bg-[#7B3FE4] hover:bg-[#6a32d1] text-white px-8 py-3 font-semibold"
              >
                {deployToken.isPending ? (
                  <>
                    <div className="animate-spin rounded-md h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deploying Token...
                  </>
                ) : (
                  'Deploy Token'
                )}
                <ArrowRight className="w-4 h-4" />
              </Button>

            </div>

            {/* Token Overview Card */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#7B3FE4] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">T</span>
                  </div>
                  {formData.symbol}
                </CardTitle>
                <CardDescription>
                  {formData.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {/* Left Column - Token Info */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase">Token name</p>
                      <p className="font-medium">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground uppercase">Token symbol</p>
                      <p className="font-medium">{formData.symbol}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground uppercase">Decimals</p>
                      <p className="font-medium">{formData.decimals}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground uppercase">Total supply</p>
                      <p className="font-medium">{formData.totalSupply.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Information */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Linked Property</CardTitle>
                <CardDescription>This token will be linked to the following property</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                    {property.images && property.images[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground">No image</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{property.name}</h3>
                    <p className="text-sm text-muted-foreground">{property.location}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{property.property_type}</Badge>
                      <Badge variant="outline">{property.risk_level} risk</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Settings */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Compliance Configuration</CardTitle>
                <CardDescription>Review the compliance rules that will be applied to this token</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-green-600 font-bold">🌍</span>
                    </div>
                    <h4 className="font-semibold mb-2">Country Restrictions</h4>
                    <p className="text-sm text-muted-foreground">
                      Allowed: {formData.countryRestrictions.join(', ')}
                    </p>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 font-bold">💰</span>
                    </div>
                    <h4 className="font-semibold mb-2">Balance Limits</h4>
                    <p className="text-sm text-muted-foreground">
                      Max: {formData.maxBalance.toLocaleString()} tokens
                    </p>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-purple-600 font-bold">👥</span>
                    </div>
                    <h4 className="font-semibold mb-2">Holder Limits</h4>
                    <p className="text-sm text-muted-foreground">
                      Max: {formData.maxHolders} holders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Warning */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-sm">⚠️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-800 mb-2">Important Notice</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Token deployment is irreversible and will incur gas costs</li>
                      <li>• Ensure all compliance settings are correct before proceeding</li>
                      <li>• The token will be linked to the property permanently</li>
                      <li>• You will become the token owner and can manage compliance rules</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeployToken;
