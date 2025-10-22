import { IconTrendingDown, IconTrendingUp, IconWallet } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface PortfolioOverviewWidgetProps {
  data?: {
    totalBalance: number
    tokensHeld: number
    change24h: number
    currency: string
  }
}

export function PortfolioOverviewWidget({
  data = {
    totalBalance: 12345.67,
    tokensHeld: 5,
    change24h: 2.4,
    currency: "USD",
  },
}: PortfolioOverviewWidgetProps) {
  const isPositive = data.change24h >= 0
  const TrendIcon = isPositive ? IconTrendingUp : IconTrendingDown

  return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-sm">
            <IconWallet className="size-4" />
            Portfolio Overview            
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${data.totalBalance.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant={isPositive ? "outline" : "destructive"}>
              <TrendIcon />
              {isPositive ? "+" : ""}{data.change24h}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
          {data.tokensHeld} tokens held
          {isPositive ? <IconTrendingUp className="size-4 text-green-500" /> : <IconTrendingDown className="size-4 text-red-500" />}
          </div>
          <div className="text-muted-foreground">
            {isPositive ? "Portfolio growing this month" : "Portfolio declined this month"}
          </div>
        </CardFooter>
      </Card>
  )
}
