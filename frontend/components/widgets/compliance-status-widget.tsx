import { IconShieldCheck, IconAlertTriangle } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ComplianceStatusWidgetProps {
  data?: {
    kycStatus: 'verified' | 'pending' | 'failed'
    amlStatus: 'passed' | 'pending' | 'failed'
    lastCheck: string
  }
}

export function ComplianceStatusWidget({
  data = {
    kycStatus: 'verified',
    amlStatus: 'passed',
    lastCheck: new Date().toISOString()
  }
}: ComplianceStatusWidgetProps) {
  const isFullyCompliant = data.kycStatus === 'verified' && data.amlStatus === 'passed'
  const StatusIcon = isFullyCompliant ? IconShieldCheck : IconAlertTriangle

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
      case 'passed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified'
      case 'passed':
        return 'Passed'
      case 'pending':
        return 'Pending'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconShieldCheck className="size-4" />
            Compliance Status
          </CardDescription>
          <CardTitle className="text-2xl whitespace-nowrap font-semibold tabular-nums @[250px]/card:text-3xl">
            {isFullyCompliant ? 'Compliant' : 'Review Required'}
          </CardTitle>
          <CardAction>
            <Badge variant={isFullyCompliant ? "outline" : "destructive"}>
            <StatusIcon className="size-3" />
            {isFullyCompliant ? 'Verified' : 'Action Needed'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex items-center justify-between w-full">
          <span className="font-medium">KYC Status</span>
          <Badge variant="outline" className={getStatusColor(data.kycStatus)}>
            {getStatusText(data.kycStatus)}
          </Badge>
        </div>
        <div className="flex items-center justify-between w-full">
          <span className="font-medium">AML Check</span>
          <Badge variant="outline" className={getStatusColor(data.amlStatus)}>
            {getStatusText(data.amlStatus)}
          </Badge>
        </div>
          <div className="text-muted-foreground text-xs">Last checked: {new Date(data.lastCheck).toLocaleDateString()}s</div>
        </CardFooter>
      </Card>
  )
}
