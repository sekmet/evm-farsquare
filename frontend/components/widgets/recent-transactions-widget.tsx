import { IconArrowUp, IconArrowDown, IconRepeat } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Transaction {
  id: string
  type: 'transfer' | 'dividend' | 'swap' | 'mint' | 'burn'
  amount: number
  currency: string
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
}

interface RecentTransactionsWidgetProps {
  data?: {
    transactions: Transaction[]
  }
}

export function RecentTransactionsWidget({
  data = {
    transactions: [
      {
        id: '1',
        type: 'transfer',
        amount: 500.00,
        currency: 'USD',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'completed'
      },
      {
        id: '2',
        type: 'dividend',
        amount: 25.00,
        currency: 'USD',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: 'completed'
      },
      {
        id: '3',
        type: 'swap',
        amount: -50.00,
        currency: 'USD',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        status: 'completed'
      }
    ]
  }
}: RecentTransactionsWidgetProps) {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return IconArrowUp
      case 'dividend':
        return IconArrowDown
      case 'swap':
        return IconRepeat
      default:
        return IconArrowUp
    }
  }

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'Token Transfer'
      case 'dividend':
        return 'Property Dividend'
      case 'swap':
        return 'AMM Swap'
      case 'mint':
        return 'Token Mint'
      case 'burn':
        return 'Token Burn'
      default:
        return 'Transaction'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const totalTransactions = data.transactions.length
  const recentCompleted = data.transactions.filter(t => t.status === 'completed').length

  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
      <CardHeader className="gap-3 pb-4">
        <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconRepeat className="size-4" />
          Recent Transactions
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {recentCompleted} of {totalTransactions}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className="px-2 py-0.5 text-xs">
            Last 7 days
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex w-full flex-col gap-3">
          {data.transactions.slice(0, 3).map((transaction) => {
            const IconComponent = getTransactionIcon(transaction.type)
            return (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className={`size-4 ${getTransactionColor(transaction.amount)}`} />
                  <span className="font-medium">{getTransactionLabel(transaction.type)}</span>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${getTransactionColor(transaction.amount)}`}>
                    {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(transaction.timestamp)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="text-muted-foreground text-xs mt-2">
          ERC-3643 compliant transfers
        </div>
      </CardFooter>
    </Card>
  )
}
