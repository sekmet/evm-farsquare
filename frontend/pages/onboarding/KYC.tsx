import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { useDocumentUpload } from "@/hooks/use-document-upload";
import { useKYCStatus } from "@/hooks/use-kyc-status";
import { useIdentitySetup } from "@/hooks/use-identity-setup";
import { KYCStatusDisplay } from "@/components/onboarding/kyc-status-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, Shield } from "lucide-react";

const kycFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().min(1, "Address is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  sourceOfFunds: z.string().min(1, "Source of funds is required"),
  isPEP: z.boolean(),
});

type KYCFormData = z.infer<typeof kycFormSchema>;

export default function OnboardingKYC() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { uploads, uploadDocument } = useDocumentUpload(sessionId!);
  const { data: kycStatus, isLoading: statusLoading } = useKYCStatus(sessionId!);
  const { sessionData } = useIdentitySetup(sessionId!);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<KYCFormData>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      address: "",
      taxId: "",
      sourceOfFunds: "",
      isPEP: false,
    },
  });

  // Load identity information from session data
  useEffect(() => {
    if (sessionData?.jurisdiction) {
      // Display jurisdiction information
      console.log('User jurisdiction:', sessionData.jurisdiction);
    }
  }, [sessionData]);

  // Auto-fill form with extracted data
  const latestUpload = uploads.find(u => u.extractedData);
  if (latestUpload?.extractedData && !form.getValues().firstName) {
    form.setValue('firstName', latestUpload.extractedData.firstName || '');
    form.setValue('lastName', latestUpload.extractedData.lastName || '');
    form.setValue('dateOfBirth', latestUpload.extractedData.dateOfBirth || '');
    form.setValue('address', latestUpload.extractedData.address || '');
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadDocument.mutate({ file, type });
    }
  };

  const onSubmit = async (data: KYCFormData) => {
    setIsSubmitting(true);
    try {
      // Mock API call for form submission
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to qualification step
      navigate(`/onboarding/qualification/${sessionId}`);
    } catch (error) {
      console.error('KYC submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const documentTypes = [
    { key: 'id', label: 'Government ID', description: 'Passport or national ID card', required: true },
    { key: 'address', label: 'Proof of Address', description: 'Utility bill or bank statement', required: true },
    { key: 'income', label: 'Proof of Income', description: 'Pay stubs or tax returns', required: false },
  ];

  const getUploadStatus = (type: string) => {
    return uploads.find(u => u.type === type);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
      <div className="container mx-auto mt-0">
        {/* Progress Indicator */}
        <div className="mb-8">
          <OnboardingProgress currentStep="kyc" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* KYC Status */}
            {!statusLoading && kycStatus && (
              <KYCStatusDisplay status={kycStatus} />
            )}

            {/* Document Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Document Verification
                </CardTitle>
                <CardDescription className="text-lg">
                  Upload required documents for KYC compliance verification
                </CardDescription>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    ERC-3643 Compliant
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Secure & Encrypted
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {documentTypes.map((docType) => {
                  const upload = getUploadStatus(docType.key);
                  return (
                    <div key={docType.key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{docType.label}</h4>
                          <p className="text-sm text-gray-600">{docType.description}</p>
                          {docType.required && (
                            <Badge variant="secondary" className="mt-1">Required</Badge>
                          )}
                        </div>
                        {upload ? (
                          <div className="flex items-center gap-2">
                            {upload.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : upload.status === 'processing' ? (
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            )}
                            <span className="text-sm">
                              {upload.status === 'completed' ? 'Processed' :
                               upload.status === 'processing' ? 'Processing...' : 'Upload failed'}
                            </span>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload(e, docType.key)}
                            />
                            <Button variant="outline" size="sm" asChild>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                      {upload && (
                        <div className="mt-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4 inline mr-1" />
                          {upload.filename}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Identity Information Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Identity Information</CardTitle>
                <CardDescription>
                  Personal details for compliance verification
                  {sessionData?.jurisdiction && (
                    <span className="block mt-1 text-sm text-blue-600">
                      Jurisdiction: {sessionData.jurisdiction.toUpperCase()}
                    </span>
                  )}
                  {latestUpload?.extractedData && (
                    <span className="text-green-600 ml-2">✓ Auto-filled from document</span>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax ID / SSN</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sourceOfFunds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source of Funds</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Employment, Investment, Inheritance" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                      size="lg"
                    >
                      {isSubmitting ? (
                        "Submitting KYC..."
                      ) : (
                        <>
                          Submit for Verification
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Security Notice:</strong> All documents are encrypted during transmission and storage.
                We comply with GDPR, CCPA, and AML regulations. Documents are automatically deleted after verification.
              </AlertDescription>
            </Alert>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Verification Process</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Document Upload</h4>
                    <p className="text-sm text-gray-600">
                      Secure upload with OCR processing
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Identity Verification</h4>
                    <p className="text-sm text-gray-600">
                      Cross-reference with multiple sources
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5" />
                  <div>
                    <h4 className="font-medium">AML Screening</h4>
                    <p className="text-sm text-gray-600">
                      Anti-money laundering compliance check
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Final Approval</h4>
                    <p className="text-sm text-gray-600">
                      ERC-3643 compliance verification
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your personal information is protected under strict privacy regulations.
                We only collect and process data necessary for regulatory compliance.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
