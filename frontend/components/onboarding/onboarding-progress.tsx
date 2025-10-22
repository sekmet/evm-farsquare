import { cn } from "@/lib/utils";

interface ProgressProps {
  currentStep: string;
}

export function OnboardingProgress({ currentStep }: ProgressProps) {
  const steps = [
    { id: 'start', label: 'Getting Started', completed: true },
    { id: 'kyc', label: 'Identity Verification' },
    { id: 'identity', label: 'On-Chain Identity Setup' },
    { id: 'qualification', label: 'Qualification Review' },
    { id: 'esign', label: 'Electronic Signature' },
    { id: 'complete', label: 'Onboarding Complete' }
  ];

  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="flex items-center space-x-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            step.completed ? "bg-green-500 text-white" :
            step.id === currentStep ? "bg-blue-500 text-white" :
            "bg-gray-200 text-gray-600"
          )}>
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              "w-12 h-px mx-2",
              index < currentIndex ? "bg-green-500" : "bg-gray-300"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
