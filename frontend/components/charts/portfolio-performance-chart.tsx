"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

const portfolioData = [
  { date: "2024-10-01", value: 12000, benchmark: 11800 },
  { date: "2024-10-02", value: 12150, benchmark: 11850 },
  { date: "2024-10-03", value: 11900, benchmark: 11900 },
  { date: "2024-10-04", value: 12200, benchmark: 11950 },
  { date: "2024-10-05", value: 12300, benchmark: 12000 },
  { date: "2024-10-06", value: 12100, benchmark: 12050 },
  { date: "2024-10-07", value: 12400, benchmark: 12100 },
  { date: "2024-10-08", value: 12200, benchmark: 12150 },
  { date: "2024-10-09", value: 12500, benchmark: 12200 },
  { date: "2024-10-10", value: 12345, benchmark: 12250 },
]

const chartConfig = {
  value: {
    label: "Portfolio Value",
    color: "var(--primary)",
  },
  benchmark: {
    label: "Benchmark",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

export function PortfolioPerformanceChart() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = portfolioData.filter((item) => {
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

  const currentValue = filteredData[filteredData.length - 1]?.value || 0
  const startValue = filteredData[0]?.value || 0
  const changePercent = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Token valuation tracking • Automated price feeds
          </span>
          <span className="@[540px]/card:hidden">Portfolio tracking</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
            <ToggleGroupItem value="90d">90 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold tabular-nums">
              ${currentValue.toLocaleString()}
            </div>
            <div className={`text-sm ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}% from start
            </div>
          </div>
        </div>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-value)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-benchmark)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-benchmark)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
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
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="benchmark"
              type="natural"
              fill="url(#fillBenchmark)"
              stroke="var(--color-benchmark)"
              stackId="a"
              strokeDasharray="5 5"
            />
            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillValue)"
              stroke="var(--color-value)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
