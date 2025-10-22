"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const propertyData = [
  { month: "Jul", rentalIncome: 1250, occupancyRate: 92, propertyValue: 450000 },
  { month: "Aug", rentalIncome: 1320, occupancyRate: 95, propertyValue: 455000 },
  { month: "Sep", rentalIncome: 1180, occupancyRate: 88, propertyValue: 452000 },
  { month: "Oct", rentalIncome: 1450, occupancyRate: 97, propertyValue: 460000 },
  { month: "Nov", rentalIncome: 1380, occupancyRate: 94, propertyValue: 458000 },
  { month: "Dec", rentalIncome: 1520, occupancyRate: 98, propertyValue: 465000 },
]

const chartConfig = {
  rentalIncome: {
    label: "Rental Income ($)",
    color: "var(--primary)",
  },
  occupancyRate: {
    label: "Occupancy Rate (%)",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function PropertyAnalyticsChart() {
  const isMobile = useIsMobile()
  const [metric, setMetric] = React.useState("rentalIncome")

  const latestData = propertyData[propertyData.length - 1]
  const avgRentalIncome = propertyData.reduce((sum, item) => sum + item.rentalIncome, 0) / propertyData.length
  const avgOccupancyRate = propertyData.reduce((sum, item) => sum + item.occupancyRate, 0) / propertyData.length
  const totalIncome = propertyData.reduce((sum, item) => sum + item.rentalIncome, 0)

  const getMetricDisplay = () => {
    switch (metric) {
      case 'rentalIncome':
        return {
          title: 'Monthly Rental Income',
          value: `$${avgRentalIncome.toFixed(0)}`,
          subtitle: `Total: $${totalIncome.toLocaleString()}`
        }
      case 'occupancyRate':
        return {
          title: 'Average Occupancy Rate',
          value: `${avgOccupancyRate.toFixed(1)}%`,
          subtitle: 'Last 6 months'
        }
      default:
        return {
          title: 'Property Analytics',
          value: '$0',
          subtitle: ''
        }
    }
  }

  const metricDisplay = getMetricDisplay()

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Property Analytics</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Performance metrics • Rental income tracking
          </span>
          <span className="@[540px]/card:hidden">Property performance</span>
        </CardDescription>
        <CardAction>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select metric"
            >
              <SelectValue placeholder="Rental Income" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="rentalIncome" className="rounded-lg">
                Rental Income
              </SelectItem>
              <SelectItem value="occupancyRate" className="rounded-lg">
                Occupancy Rate
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">{metricDisplay.title}</div>
          <div className="text-2xl font-bold tabular-nums">
            {metricDisplay.value}
          </div>
          <div className="text-sm text-muted-foreground">
            {metricDisplay.subtitle}
          </div>
        </div>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] w-full"
        >
          <BarChart data={propertyData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `${value} 2024`}
                />
              }
            />
            <Bar
              dataKey={metric}
              fill={`var(--color-${metric})`}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Current Month</div>
            <div className="font-semibold">
              {metric === 'rentalIncome'
                ? `$${latestData.rentalIncome}`
                : `${latestData.occupancyRate}%`
              }
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Property Value</div>
            <div className="font-semibold">
              ${latestData.propertyValue.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
