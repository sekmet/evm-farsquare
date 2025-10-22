import { IconTrendingUp, IconChartBar } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Order {
  id: string
  type: 'amm_position' | 'orderbook_bid' | 'orderbook_ask'
  value: number
  currency: string
  pnl: number
  status: 'active' | 'pending' | 'closing'
}

interface ActiveOrdersWidgetProps {
  data?: {
    orders: Order[]
    totalValue: number
  }
}

export function ActiveOrdersWidget({
  data = {
    orders: [
      {
        id: '1',
        type: 'amm_position',
        value: 1200,
        currency: 'USD',
        pnl: 45.50,
        status: 'active'
      },
      {
        id: '2',
        type: 'orderbook_bid',
        value: 5.5,
        currency: 'HBAR',
        pnl: 0,
        status: 'pending'
      }
    ],
    totalValue: 1205.5
  }
}: ActiveOrdersWidgetProps) {
  const activeOrders = data.orders.filter(order => order.status === 'active').length
  const totalPnl = data.orders.reduce((sum, order) => sum + order.pnl, 0)
  const isPositivePnl = totalPnl >= 0

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'amm_position':
        return 'AMM Position'
      case 'orderbook_bid':
        return 'Orderbook Bid'
      case 'orderbook_ask':
        return 'Orderbook Ask'
      default:
        return 'Order'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'closing':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
      <CardHeader className="gap-3 pb-4">
        <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconChartBar className="size-4" />
          Active Orders
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          ${data.totalValue.toLocaleString()}
        </CardTitle>
        <CardAction>
          <Badge variant={isPositivePnl ? "default" : "destructive"} className="gap-1 px-2 py-0.5">
            <IconTrendingUp className={`size-3 ${!isPositivePnl ? 'rotate-180' : ''}`} />
            {isPositivePnl ? '+' : ''}${Math.abs(totalPnl).toFixed(2)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex w-full flex-col gap-3">
          {data.orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{getOrderTypeLabel(order.type)}</span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {order.value} {order.currency}
                  </span>
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </div>
              {order.pnl !== 0 && (
                <div className={`font-medium ${order.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {order.pnl >= 0 ? '+' : ''}${Math.abs(order.pnl).toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="text-muted-foreground text-xs mt-2">
          {activeOrders} active position{activeOrders !== 1 ? 's' : ''} • AMM + Orderbook
        </div>
      </CardFooter>
    </Card>
  )
}
