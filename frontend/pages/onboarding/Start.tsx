import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Shield, Users, FileText, ArrowRight } from "lucide-react";
import { onboardingStartSchema, OnboardingStartData } from "@/schemas/onboarding-schemas";
import { useWallet } from "@/contexts/wallet-context";
import { useOnboardingStart } from "@/hooks/use-onboarding-start";
import { useOnboardingStatus } from "@/hooks/use-onboarding-status";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function OnboardingStart() {
  const { state } = useWallet();
  const navigate = useNavigate();
  const { startOnboarding } = useOnboardingStart();

  // Check existing onboarding status
  const { data: onboardingData, isLoading: statusLoading } = useOnboardingStatus(state.address || '');

  // Redirect to current step if user already has an active onboarding session
  useEffect(() => {
    if (!statusLoading && onboardingData?.success && onboardingData.data && onboardingData.session) {
      const { data: statusData, session } = onboardingData;
      
      if (statusData.onboardingStatus === 'in_progress' && session) {
        // User has active onboarding session, redirect to current step
        const nextStep = statusData.userType === 'individual' ? 'kyc' : 'identity';
        const currentStep = session.currentStep || nextStep;
        navigate(`/onboarding/${currentStep}/${session.sessionId}`);
      } else if (statusData.onboardingStatus === 'completed') {
        // User has completed onboarding, redirect to wallet
        navigate('/wallet');
      }
    }

  }, [onboardingData, statusLoading, navigate]);

  const form = useForm<OnboardingStartData>({
    resolver: zodResolver(onboardingStartSchema),
    defaultValues: {
      userType: undefined,
      jurisdiction: '',
      email: '',
      consents: {
        privacy: false,
        terms: false,
        dataProcessing: false,
      }
    }
  });

  const onSubmit = (data: OnboardingStartData) => {
    if (!state.isConnected || !state.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to start onboarding",
        variant: "destructive",
      });
      navigate('/wallet');
      return;
    }

    startOnboarding.mutate(data);
  };

  const jurisdictions = [
    { value: 'us', label: 'United States', flag: '🇺🇸' },
    { value: 'eu', label: 'European Union', flag: '🇪🇺' },
    { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'ca', label: 'Canada', flag: '🇨🇦' },
    { value: 'au', label: 'Australia', flag: '🇦🇺' },
    { value: 'sg', label: 'Singapore', flag: '🇸🇬' },
  ];


  
  if (statusLoading) {
    return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="max-w-4xl mx-auto mt-0">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking onboarding status...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center">
      <div className="w-full">
      <div className="container mx-auto mt-0 p-6">
        {/* Progress Indicator */}
        <div className="mb-8">
          <OnboardingProgress currentStep="start" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Complete Your Investor Onboarding
                </CardTitle>
                <CardDescription className="text-lg">
                  Begin your journey with blockchain permissioned token compliance and ETH settlement capabilities
                </CardDescription>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    15-20 minutes
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    Secure & Compliant
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* User Type Selection */}
                    <FormField
                      control={form.control}
                      name="userType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-base font-semibold">Select Your User Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <RadioGroupItem value="individual" id="individual" />
                                <label htmlFor="individual" className="flex-1 cursor-pointer">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium">Individual Investor</span>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Personal investment in tokenized real estate assets
                                  </p>
                                </label>
                              </div>

                              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <RadioGroupItem value="entity" id="entity" />
                                <label htmlFor="entity" className="flex-1 cursor-pointer">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-5 h-5 text-green-600" />
                                    <span className="font-medium">Entity/Institutional</span>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Corporate or institutional investment entity
                                  </p>
                                </label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Jurisdiction Selection */}
                    <FormField
                      control={form.control}
                      name="jurisdiction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Jurisdiction</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your jurisdiction" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {jurisdictions.map((jurisdiction) => (
                                <SelectItem key={jurisdiction.value} value={jurisdiction.value}>
                                  <div className="flex items-center gap-2">
                                    <span>{jurisdiction.flag}</span>
                                    <span>{jurisdiction.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            This helps us ensure compliance with local regulations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email Address */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your.email@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            We'll use this to send you important updates about your onboarding
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Consents */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold">Legal Consents</h3>

                      <FormField
                        control={form.control}
                        name="consents.privacy"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                I agree to the{" "}
                                <a href="#" className="text-blue-600 hover:underline">
                                  Privacy Policy
                                </a>
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="consents.terms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                I accept the{" "}
                                <a href="#" className="text-blue-600 hover:underline">
                                  Terms of Service
                                </a>{" "}
                                for EVM smart contracts
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="consents.dataProcessing"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                I consent to the processing of my personal data for KYC and compliance purposes
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={startOnboarding.isPending}
                    >
                      {startOnboarding.isPending ? (
                        "Starting Onboarding..."
                      ) : (
                        <>
                          Start Onboarding
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Onboarding Process</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Getting Started</h4>
                    <p className="text-sm text-gray-600">Complete basic information</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Identity Verification</h4>
                    <p className="text-sm text-gray-600">KYC and document upload</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5" />
                  <div>
                    <h4 className="font-medium">On-Chain Identity Setup</h4>
                    <p className="text-sm text-gray-600">Wallet connection and identity</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Qualification Review</h4>
                    <p className="text-sm text-gray-600">Investment qualification check</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Electronic Signature</h4>
                    <p className="text-sm text-gray-600">Legal agreement signing</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Onboarding Complete</h4>
                    <p className="text-sm text-gray-600">Start investing in properties</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                All information is encrypted and stored securely. We comply with GDPR, CCPA, and other privacy regulations.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
