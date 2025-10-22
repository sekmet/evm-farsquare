import { useNavigate } from "react-router-dom";
import { TrendingUp, User, Settings, Bell, BookOpen, Users, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NextStepsProps {
  investorId: string;
}

export function NextSteps({ investorId }: NextStepsProps) {
  const navigate = useNavigate();

  const primaryActions = [
    {
      title: 'Browse Investment Opportunities',
      description: 'Explore ERC-3643 compliant tokenized assets',
      action: () => navigate('/marketplace'),
      icon: TrendingUp,
      variant: 'default' as const,
    },
    {
      title: 'Complete Your Profile',
      description: 'Add investment preferences and risk tolerance',
      action: () => navigate('/profile'),
      icon: User,
      variant: 'outline' as const,
    },
  ];

  const secondaryActions = [
    {
      title: 'Set Up Notifications',
      description: 'Get alerts for new opportunities',
      action: () => navigate('/settings/notifications'),
      icon: Bell,
    },
    {
      title: 'View Educational Resources',
      description: 'Learn more about tokenized investments',
      action: () => navigate('/learn'),
      icon: BookOpen,
    },
    {
      title: 'Join Investor Community',
      description: 'Connect with other qualified investors',
      action: () => navigate('/community'),
      icon: Users,
    },
    {
      title: 'Contact Support',
      description: 'Get help from our compliance team',
      action: () => navigate('/support'),
      icon: Phone,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">What's Next?</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {primaryActions.map((action) => (
            <Card key={action.title} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <action.icon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                    <Button variant={action.variant} onClick={action.action}>
                      Get Started
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Additional Actions</h3>
        <div className="space-y-2">
          {secondaryActions.map((action) => (
            <Button
              key={action.title}
              variant="ghost"
              className="w-full justify-start h-auto p-4"
              onClick={action.action}
            >
              <action.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-sm text-gray-500">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
