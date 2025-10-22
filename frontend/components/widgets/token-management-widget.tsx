import {
  IconAlertTriangle,
  IconCoin,
  IconLock,
  IconLockOpen,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardFooter,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface TokenStatusWidgetProps {
  data?: {
    tokenSymbol: string
    tokenName: string
    tokenTicker: string
    status: string
    balance: {
      quantity: number
      fiat: number
    }
    blocked: {
      count: number
      fiat: number
    }
    unblocked: {
      count: number
      fiat: number
    }
  }
}

export function TokenStatusWidget({
  data = {
    tokenSymbol: 'TSTMATIC6',
    tokenName: 'Test MATIC 6',
    tokenTicker: 'MATIC',
    status: 'Tokenholder',
    balance: {
      quantity: 5,
      fiat: 20,
    },
    blocked: {
      count: 0,
      fiat: 0,
    },
    unblocked: {
      count: 5,
      fiat: 20,
    },
  }
}: TokenStatusWidgetProps) {
  const isTokenholder = data.status.toLowerCase() === 'tokenholder'
  const StatusIcon = isTokenholder ? IconCoin : IconAlertTriangle

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unblocked':
        return 'bg-green-100 text-green-800 text-sm'
      case 'blocked':
        return 'bg-red-100 text-red-800 text-sm'
      default:
        return 'bg-gray-100 text-gray-800 text-sm'
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value)

  return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconCoin className="size-4" />
            {data.tokenName}
          </CardDescription>
          <CardTitle className="text-2xl whitespace-nowrap font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.balance.quantity} <span className="text-muted-foreground text-lg">{data.tokenTicker}</span>
          </CardTitle>
          <CardAction>
            <Badge variant={isTokenholder ? "outline" : "destructive"}>
              <StatusIcon className="size-4" />
              {data.status}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex items-center justify-between w-full">
          <Badge variant="outline" className={getStatusColor('blocked')}>
              <IconLock className="size-4" />
              {data.blocked.count} <span>Blocked</span>
          </Badge>
          <div className="text-sm font-semibold text-muted-foreground">{formatCurrency(data.blocked.fiat)}</div>
        </div>
        <div className="flex items-center justify-between w-full">
          <Badge variant="outline" className={getStatusColor('unblocked')}>
            <IconLockOpen className="size-4" />
            {data.unblocked.count} <span>Unblocked</span>
          </Badge>
          <div className="text-sm font-semibold text-emerald-600">{formatCurrency(data.unblocked.fiat)}</div>
        </div>
        </CardFooter>
      </Card>
  )
}
