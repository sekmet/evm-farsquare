import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReviewStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp: string;
  documents?: Array<{ id: string; name: string }>;
}

interface TimelineProps {
  steps: ReviewStep[];
}

export function ReviewTimeline({ steps }: TimelineProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start space-x-4">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
            step.status === 'completed' ? "bg-green-500 text-white" :
            step.status === 'current' ? "bg-blue-500 text-white" :
            "bg-gray-200 text-gray-600"
          )}>
            {step.status === 'completed' ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{step.title}</h3>
              {step.timestamp && (
                <time className="text-sm text-gray-500">
                  {new Date(step.timestamp).toLocaleDateString()} at{' '}
                  {new Date(step.timestamp).toLocaleTimeString()}
                </time>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{step.description}</p>
            {step.documents && step.documents.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {step.documents.map((doc) => (
                  <Badge key={doc.id} variant="outline">
                    {doc.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
