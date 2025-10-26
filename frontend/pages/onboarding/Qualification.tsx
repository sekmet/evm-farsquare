import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { QualificationCriteria } from "@/components/onboarding/qualification-criteria";
import { ReviewTimeline } from "@/components/onboarding/review-timeline";
import { useQualificationStatus } from "@/hooks/use-qualification-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, MessageCircle, ArrowRight, Phone, Mail } from "lucide-react";

export default function OnboardingQualification() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: qualification, isLoading, error } = useQualificationStatus(sessionId!);

  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const handleContinue = () => {
    if (qualification?.overallStatus === 'approved') {
      navigate(`/onboarding/esign/${sessionId}`);
    } else if (qualification?.overallStatus === 'rejected') {
      // Show appeal options
      setIsSubmittingAppeal(true);
    }
  };

  const handleAppeal = () => {
    // Mock appeal submission
    alert('Appeal submitted. A compliance officer will review your case.');
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          color: 'green',
          icon: CheckCircle,
          title: 'Qualification Approved',
          description: 'Your investor qualification has been approved. You can now proceed to electronic signature.',
          canContinue: true
        };
      case 'rejected':
        return {
          color: 'red',
          icon: AlertTriangle,
          title: 'Qualification Rejected',
          description: 'Your application does not meet current qualification requirements. You may appeal this decision.',
          canContinue: false
        };
      case 'pending':
        return {
          color: 'yellow',
          icon: Clock,
          title: 'Under Review',
          description: 'Your qualification is currently being reviewed by our compliance team.',
          canContinue: false
        };
      default:
        return {
          color: 'gray',
          icon: Clock,
          title: 'Review Pending',
          description: 'Your qualification review has not yet begun.',
          canContinue: false
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading qualification status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load qualification status. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(qualification?.overallStatus || 'pending');

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
      <div className="max-w-6xl mx-auto mt-0">
        {/* Progress Indicator */}
        <div className="mb-8">
          <OnboardingProgress currentStep="qualification" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Qualification Status Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <statusDisplay.icon className={`h-8 w-8 text-${statusDisplay.color}-500`} />
                    <div>
                      <CardTitle className="text-2xl">{statusDisplay.title}</CardTitle>
                      <CardDescription className="text-lg">
                        {statusDisplay.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {qualification?.progress || 0}% Complete
                  </Badge>
                </div>

                {qualification?.progress !== undefined && (
                  <div className="mt-4">
                    <Progress value={qualification.progress} className="h-3" />
                    <p className="text-sm text-gray-600 mt-2">
                      Estimated completion: {qualification.estimatedCompletion}
                    </p>
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Qualification Criteria */}
            {qualification?.criteria && (
              <Card>
                <CardHeader>
                  <CardTitle>Qualification Criteria</CardTitle>
                  <CardDescription>
                    Review of your compliance with ERC-3643 qualification requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QualificationCriteria criteria={qualification.criteria} />
                </CardContent>
              </Card>
            )}

            {/* Review Timeline */}
            {qualification?.timeline && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Timeline</CardTitle>
                  <CardDescription>
                    Complete audit trail of your qualification review process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReviewTimeline steps={qualification.timeline} />
                </CardContent>
              </Card>
            )}

            {/* Action Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {statusDisplay.canContinue ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Congratulations! Your qualification has been approved. You can now proceed to the electronic signature step.
                      </AlertDescription>
                    </Alert>
                    <Button onClick={handleContinue} className="w-full" size="lg">
                      Continue to Electronic Signature
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : qualification?.overallStatus === 'rejected' ? (
                  <div className="space-y-4">
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        If you believe this decision was made in error, you have the right to appeal.
                        Appeals are reviewed by senior compliance officers within 5-7 business days.
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleAppeal}
                      variant="outline"
                      className="w-full"
                      disabled={isSubmittingAppeal}
                    >
                      {isSubmittingAppeal ? 'Submitting Appeal...' : 'Submit Appeal'}
                    </Button>
                  </div>
                ) : (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Your qualification is still under review. We'll notify you when there are updates.
                      Average review time is 2-3 business days.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Support & Communication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Compliance Chat</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Chat with a compliance officer for questions about your qualification.
                    </p>
                    <Button variant="outline" size="sm">
                      Start Chat
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Email Support</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Send detailed questions to our compliance team.
                    </p>
                    <Button variant="outline" size="sm">
                      Send Email
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Phone Support</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Speak directly with a compliance specialist.
                    </p>
                    <Button variant="outline" size="sm">
                      Call Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                All communications with compliance officers are recorded and may be used in regulatory reporting.
                Your privacy is protected under applicable data protection laws.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
