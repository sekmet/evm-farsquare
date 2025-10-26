import { useState } from "react";
import { useParams } from "react-router-dom";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { DocumentViewer } from "@/components/onboarding/document-viewer";
import { SignatureCanvas } from "@/components/onboarding/signature-canvas";
import { useESignature } from "@/hooks/use-esignature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, ArrowRight, Shield, AlertTriangle } from "lucide-react";

export default function OnboardingESign() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { documents, signDocument, completeSigning, isLoading } = useESignature(sessionId!);

  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string>("");
  const [consents, setConsents] = useState({
    legal: false,
    binding: false,
    understood: false,
  });

  const handleDocumentSign = (documentId: string) => {
    setSelectedDocument(documentId);
  };

  const handleSignatureCapture = (data: string) => {
    setSignatureData(data);
  };

  const handleConfirmSignature = () => {
    if (selectedDocument && signatureData) {
      signDocument.mutate({
        documentId: selectedDocument,
        signature: {
          type: 'drawn',
          data: signatureData,
          timestamp: new Date().toISOString(),
        }
      });
      setSelectedDocument(null);
      setSignatureData("");
    }
  };

  const handleConsentChange = (consent: keyof typeof consents) => {
    setConsents(prev => ({
      ...prev,
      [consent]: !prev[consent]
    }));
  };

  const allDocumentsSigned = documents?.every(doc => doc.status === 'signed') ?? false;
  const allConsentsGiven = Object.values(consents).every(Boolean);

  const handleCompleteSigning = () => {
    if (allDocumentsSigned && allConsentsGiven) {
      completeSigning.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading documents...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
      <div className="max-w-6xl mx-auto mt-0">
        {/* Progress Indicator */}
        <div className="mb-8">
          <OnboardingProgress currentStep="esign" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Electronic Signature
                </CardTitle>
                <CardDescription className="text-lg">
                  Review and sign the required legal documents for your tokenized real estate investment account
                </CardDescription>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    Legally Binding
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Cryptographically Secure
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Document List */}
            <Card>
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
                <CardDescription>
                  Please review and sign all documents to complete your onboarding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {documents?.map((document) => (
                  <DocumentViewer
                    key={document.id}
                    document={document}
                    onSign={handleDocumentSign}
                    isSigning={signDocument.isPending && selectedDocument === document.id}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Signature Modal/Canvas */}
            {selectedDocument && (
              <Card>
                <CardHeader>
                  <CardTitle>Sign Document</CardTitle>
                  <CardDescription>
                    Draw your signature below. This will be cryptographically secured and legally binding.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <SignatureCanvas onSignature={handleSignatureCapture} />

                  <div className="flex justify-end space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedDocument(null);
                        setSignatureData("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmSignature}
                      disabled={!signatureData || signDocument.isPending}
                    >
                      {signDocument.isPending ? 'Signing...' : 'Confirm Signature'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legal Consents */}
            {allDocumentsSigned && (
              <Card>
                <CardHeader>
                  <CardTitle>Legal Consents</CardTitle>
                  <CardDescription>
                    Please confirm your understanding and acceptance of the legal implications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="legal"
                      checked={consents.legal}
                      onCheckedChange={() => handleConsentChange('legal')}
                    />
                    <label htmlFor="legal" className="text-sm leading-5 cursor-pointer">
                      I understand that electronic signatures are legally binding and equivalent to handwritten signatures under applicable law.
                    </label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="binding"
                      checked={consents.binding}
                      onCheckedChange={() => handleConsentChange('binding')}
                    />
                    <label htmlFor="binding" className="text-sm leading-5 cursor-pointer">
                      I agree to be bound by the terms and conditions in the signed documents.
                    </label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="understood"
                      checked={consents.understood}
                      onCheckedChange={() => handleConsentChange('understood')}
                    />
                    <label htmlFor="understood" className="text-sm leading-5 cursor-pointer">
                      I have read, understood, and voluntarily agree to all terms and conditions.
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completion Action */}
            {allDocumentsSigned && allConsentsGiven && (
              <Card>
                <CardContent className="pt-6">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      All documents have been signed and all legal consents have been provided.
                      You can now complete your onboarding process.
                    </AlertDescription>
                  </Alert>

                  <div className="mt-6 text-center">
                    <Button
                      onClick={handleCompleteSigning}
                      disabled={completeSigning.isPending}
                      size="lg"
                    >
                      {completeSigning.isPending ? (
                        'Completing Onboarding...'
                      ) : (
                        <>
                          Complete Onboarding
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Notice */}
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Security Notice:</strong> Your signatures are cryptographically secured and recorded on the blockchain for immutability.
                All document handling complies with ESIGN Act and UETA regulations for electronic signatures.
              </AlertDescription>
            </Alert>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Signing Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Documents Signed</span>
                    <span className="text-sm font-medium">
                      {documents?.filter(d => d.status === 'signed').length || 0} / {documents?.length || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${documents ? (documents.filter(d => d.status === 'signed').length / documents.length) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Document Status</h4>
                  {documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2 text-sm">
                      {doc.status === 'signed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={doc.status === 'signed' ? 'text-green-700' : 'text-gray-600'}>
                        {doc.title}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">Legal Framework</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• ESIGN Act Compliance</li>
                    <li>• UETA Electronic Signatures</li>
                    <li>• Blockchain Timestamping</li>
                    <li>• Cryptographic Security</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Electronic signatures are legally binding and enforceable in all US jurisdictions and most international jurisdictions.
                Your signed documents are securely stored and can be retrieved at any time.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
