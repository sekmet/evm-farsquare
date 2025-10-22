import { IconBuilding, IconTrendingUp, IconUsers, IconHome2 } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface PropertyManagementWidgetProps {
  data?: {
    ownedAssets: number
    monthlyIncome: number
    occupancyRate: number
    currency: string
  }
}

export function PropertyManagementWidget({
  data = {
    ownedAssets: 3,
    monthlyIncome: 450,
    occupancyRate: 95,
    currency: 'USD'
  }
}: PropertyManagementWidgetProps) {
  const isHighOccupancy = data.occupancyRate >= 90
  const OccupancyIcon = isHighOccupancy ? IconTrendingUp : IconUsers

  return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex gap-2">
          <IconBuilding className="size-4" />
          Property Management
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.ownedAssets * 15} <span className="text-muted-foreground text-base">Token Holders</span>
            {/* Estimated token holders per property */}
          </CardTitle>
          <CardAction>
          <Badge variant={isHighOccupancy ? "outline" : "secondary"} className="gap-1 px-2 py-0.5">
            <OccupancyIcon className="size-3" />
            {data.ownedAssets}
          </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex w-full items-center justify-between">
          <span className="font-medium">Monthly Income</span>
          <span className="font-semibold text-green-600">
            ${data.monthlyIncome}
          </span>
        </div>
        <div className="line-clamp-1 flex w-full items-center justify-between">
          <span className="font-medium">Occupancy Rate</span>
          <span className={`font-semibold ${isHighOccupancy ? 'text-green-600' : 'text-yellow-600'}`}>
            {data.occupancyRate}%
          </span>
        </div>
        <div className="text-muted-foreground text-xs mt-2">
          Performance analytics • Investor management
        </div>
        </CardFooter>
      </Card>
  )
}
