import { User, Loader, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Identity {
  verified?: boolean;
  address?: string;
}

interface IdentityStatusProps {
  identity?: Identity;
  isLoading?: boolean;
}

export function IdentityStatus({ identity, isLoading }: IdentityStatusProps) {
  if (isLoading) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Loader className="h-4 w-4 text-blue-600 animate-spin" />
        <AlertDescription className="text-blue-800">
          Connecting wallet...
        </AlertDescription>
      </Alert>
    );
  }

  if (!identity) {
    return (
      <Alert className="border-gray-200 bg-gray-50">
        <User className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-800">
          Identity not created
        </AlertDescription>
      </Alert>
    );
  }

  if (identity.verified) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Identity verified - {identity.address}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        Identity pending verification
      </AlertDescription>
    </Alert>
  );
}
