import { useParams } from "react-router-dom";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { AchievementDisplay } from "@/components/onboarding/achievement-display";
import { NextSteps } from "@/components/onboarding/next-steps";
import { useOnboardingCompletion } from "@/hooks/use-onboarding-completion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Download, Share2, Trophy, Award, Shield, FileText } from "lucide-react";

export default function OnboardingComplete() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { completionData, downloadCertificate, shareAchievement, isLoading } = useOnboardingCompletion(sessionId!);

  if (isLoading) {
    return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="max-w-6xl mx-auto mt-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading completion data...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  const handleShare = (platform: string) => {
    shareAchievement.mutate(platform);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
      <div className="max-w-6xl mx-auto -mt-8">
        {/* Progress Indicator - Hidden for completion */}
        <div className="mb-8 opacity-50">
          <OnboardingProgress currentStep="complete" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Completion Celebration */}
            <Card className="text-center border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                  Congratulations!
                </CardTitle>
                <CardDescription className="text-lg text-gray-700">
                  You have successfully completed the ERC-3643 investor onboarding process.
                  Welcome to the world of tokenized real estate investments.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex justify-center space-x-4 mb-6">
                  <Button onClick={() => downloadCertificate.mutate()} disabled={downloadCertificate.isPending}>
                    <Download className="w-4 h-4 mr-2" />
                    {downloadCertificate.isPending ? 'Generating...' : 'Download Certificate'}
                  </Button>
                  <Button variant="outline" onClick={() => handleShare('native')}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Achievement
                  </Button>
                </div>

                {completionData && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Completed on {new Date(completionData.completionDate).toLocaleDateString()}
                    </p>
                    <div className="inline-flex items-center space-x-4 bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{completionData.completedSteps}</div>
                        <div className="text-sm text-gray-600">Steps Completed</div>
                      </div>
                      <div className="w-px h-12 bg-gray-200"></div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">100%</div>
                        <div className="text-sm text-gray-600">Qualified</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            {completionData?.achievements && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Achievement Unlocked
                  </CardTitle>
                  <CardDescription>
                    Congratulations on earning these onboarding milestones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AchievementDisplay achievements={completionData.achievements} />
                </CardContent>
              </Card>
            )}

            {/* Account Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Your Qualified Investor Account</CardTitle>
                <CardDescription>
                  Your account is now fully activated for tokenized real estate investments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <Shield className="w-6 h-6 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">Identity Verified</div>
                      <div className="text-sm text-green-600">ERC-3643 compliant</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-800">Documents Signed</div>
                      <div className="text-sm text-blue-600">Legally binding agreements</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-800">KYC Approved</div>
                      <div className="text-sm text-purple-600">AML compliant</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <Award className="w-6 h-6 text-yellow-600" />
                    <div>
                      <div className="font-medium text-yellow-800">Qualified Investor</div>
                      <div className="text-sm text-yellow-600">Ready to invest</div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your investor profile is now active and you can participate in ERC-3643 compliant
                    tokenized real estate opportunities on our platform.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Next Steps */}
            {completionData && (
              <NextSteps investorId={completionData.investorId} />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Onboarding Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Onboarding Steps</span>
                    <span className="text-sm font-medium">
                      {completionData?.completedSteps || 0} / {completionData?.totalSteps || 6}
                    </span>
                  </div>
                  <Progress value={100} className="h-2" />
                  <p className="text-xs text-green-600">All steps completed successfully!</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Completed Milestones</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Identity Setup & Verification</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>KYC & AML Compliance</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Qualification Assessment</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Legal Document Signing</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Account Activation</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">What's Next</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Browse investment opportunities</li>
                    <li>• Set up investment preferences</li>
                    <li>• Configure security settings</li>
                    <li>• Join the investor community</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your onboarding completion is permanently recorded on the blockchain and
                can be verified by any participating platform or regulatory authority.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
