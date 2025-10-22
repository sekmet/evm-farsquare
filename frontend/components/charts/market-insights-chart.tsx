"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"

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

const marketData = [
  { date: "2024-10-01", realEstate: 1.2, tokenVolume: 2.1, prediction: "bullish" },
  { date: "2024-10-02", realEstate: 1.5, tokenVolume: 2.3, prediction: "bullish" },
  { date: "2024-10-03", realEstate: 0.8, tokenVolume: 1.9, prediction: "neutral" },
  { date: "2024-10-04", realEstate: 1.8, tokenVolume: 2.5, prediction: "bullish" },
  { date: "2024-10-05", realEstate: 2.1, tokenVolume: 2.8, prediction: "bullish" },
  { date: "2024-10-06", realEstate: 1.6, tokenVolume: 2.2, prediction: "bullish" },
  { date: "2024-10-07", realEstate: 1.9, tokenVolume: 2.6, prediction: "bullish" },
  { date: "2024-10-08", realEstate: 1.3, tokenVolume: 2.0, prediction: "neutral" },
  { date: "2024-10-09", realEstate: 2.2, tokenVolume: 2.9, prediction: "bullish" },
  { date: "2024-10-10", realEstate: 1.7, tokenVolume: 2.4, prediction: "bullish" },
]

const chartConfig = {
  realEstate: {
    label: "Real Estate Index",
    color: "var(--primary)",
  },
  tokenVolume: {
    label: "Token Volume ($M)",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function MarketInsightsChart() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = marketData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-10-10")
    let daysToSubtract = 30
    if (timeRange === "7d") {
      daysToSubtract = 7
    } else if (timeRange === "90d") {
      daysToSubtract = 90
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  const latestData = filteredData[filteredData.length - 1]
  const avgRealEstate = filteredData.reduce((sum, item) => sum + item.realEstate, 0) / filteredData.length
  const avgVolume = filteredData.reduce((sum, item) => sum + item.tokenVolume, 0) / filteredData.length

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'bullish':
        return 'text-green-600'
      case 'bearish':
        return 'text-red-600'
      default:
        return 'text-yellow-600'
    }
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Market Insights</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            AI-powered predictions • Real estate trends
          </span>
          <span className="@[540px]/card:hidden">Market analysis</span>
        </CardDescription>
        <CardAction>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d" className="rounded-lg">
                7 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 days
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                90 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Real Estate Index</div>
            <div className="text-lg font-semibold">
              +{avgRealEstate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Token Volume</div>
            <div className="text-lg font-semibold">
              ${avgVolume.toFixed(1)}M
            </div>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">AI Prediction</div>
            <div className={`text-lg font-semibold capitalize ${getPredictionColor(latestData?.prediction || 'neutral')}`}>
              {latestData?.prediction || 'Neutral'}
            </div>
          </div>
        </div>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] w-full"
        >
          <LineChart data={filteredData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                />
              }
            />
            <Line
              dataKey="realEstate"
              type="monotone"
              stroke="var(--color-realEstate)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="tokenVolume"
              type="monotone"
              stroke="var(--color-tokenVolume)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
