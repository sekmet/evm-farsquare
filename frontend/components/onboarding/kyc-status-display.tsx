import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type KYCStatus = 'pending' | 'approved' | 'rejected' | 'incomplete';

interface StatusProps {
  status: KYCStatus;
}

export function KYCStatusDisplay({ status }: StatusProps) {
  const getStatusConfig = (status: KYCStatus) => {
    switch (status) {
      case 'pending':
        return { color: 'yellow', icon: Clock, text: 'Processing documents...' };
      case 'approved':
        return { color: 'green', icon: CheckCircle, text: 'Verification complete' };
      case 'rejected':
        return { color: 'red', icon: XCircle, text: 'Additional information needed' };
      default:
        return { color: 'gray', icon: AlertCircle, text: 'Status unknown' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Alert className={`border-${config.color}-200 bg-${config.color}-50`}>
      <config.icon className={`h-4 w-4 text-${config.color}-600`} />
      <AlertDescription className={`text-${config.color}-800`}>
        {config.text}
      </AlertDescription>
    </Alert>
  );
}
