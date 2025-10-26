import { cn } from "@/lib/utils";

interface ProgressProps {
  currentStep: string;
}

function getStepIndex(step: number, currentStep: string) {
  let indexStep = 0;
  if (currentStep === 'start') indexStep = 0;
  if (currentStep === 'kyc') indexStep = 1;
  if (currentStep === 'identity') indexStep = 2;
  if (currentStep === 'qualification') indexStep = 3;
  if (currentStep === 'esign') indexStep = 4;
  if (currentStep === 'complete') indexStep = 5;
  return step < indexStep ? true : false;
}

export function OnboardingProgress({ currentStep }: ProgressProps) {
  const steps = [
    { id: 'start', label: 'Getting Started', completed: getStepIndex(0, currentStep) },
    { id: 'kyc', label: 'Identity Verification', completed: getStepIndex(1, currentStep) },
    { id: 'identity', label: 'On-Chain Identity Setup', completed: getStepIndex(2, currentStep) },
    { id: 'qualification', label: 'Qualification Review', completed: getStepIndex(3, currentStep) },
    { id: 'esign', label: 'Electronic Signature', completed: getStepIndex(4, currentStep) },
    { id: 'complete', label: 'Onboarding Complete', completed: getStepIndex(5, currentStep) }
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
