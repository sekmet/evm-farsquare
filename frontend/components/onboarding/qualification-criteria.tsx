import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QualificationCriterion {
  id: string;
  name: string;
  description: string;
  status: 'approved' | 'rejected' | 'pending' | 'not_started';
  comments?: string;
  evidence?: string[];
}

interface CriteriaProps {
  criteria: QualificationCriterion[];
}

export function QualificationCriteria({ criteria }: CriteriaProps) {
  const getCriterionStatus = (criterion: QualificationCriterion) => {
    if (criterion.status === 'approved') {
      return { icon: CheckCircle, color: 'green', text: 'Approved' };
    }
    if (criterion.status === 'rejected') {
      return { icon: XCircle, color: 'red', text: 'Rejected' };
    }
    if (criterion.status === 'pending') {
      return { icon: Clock, color: 'yellow', text: 'Under Review' };
    }
    return { icon: AlertCircle, color: 'gray', text: 'Not Started' };
  };

  return (
    <div className="space-y-4">
      {criteria.map((criterion) => {
        const status = getCriterionStatus(criterion);

        return (
          <Card key={criterion.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center space-x-3">
                <status.icon className={`h-5 w-5 text-${status.color}-500`} />
                <div>
                  <CardTitle className="text-lg">{criterion.name}</CardTitle>
                  <p className="text-sm text-gray-600">{criterion.description}</p>
                </div>
              </div>
              <Badge variant={status.color === 'green' ? 'default' : 'secondary'}>
                {status.text}
              </Badge>
            </CardHeader>
            {criterion.comments && (
              <CardContent>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm">{criterion.comments}</p>
                </div>
              </CardContent>
            )}
            {criterion.evidence && criterion.evidence.length > 0 && (
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Evidence Submitted:</h4>
                  <div className="flex flex-wrap gap-2">
                    {criterion.evidence.map((evidence, index) => (
                      <Badge key={index} variant="outline">
                        {evidence}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
