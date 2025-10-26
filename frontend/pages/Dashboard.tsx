import React, {useEffect} from "react";

import { RecentTransactionsWidget } from "@/components/widgets/recent-transactions-widget";
import { ActiveOrdersWidget } from "@/components/widgets/active-orders-widget";
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart";
import { MarketInsightsChart } from "@/components/charts/market-insights-chart";
import { PropertyAnalyticsChart } from "@/components/charts/property-analytics-chart";
import { PortfolioCards } from "@/components/portfolio-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { useUserProfile } from "@/hooks/use-user-profile";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch user profile to check for evm_address
  const { data: userProfile, isLoading: profileLoading } = useUserProfile(user?.id);

  useEffect(() => {
    if (profileLoading) return;
    if (!userProfile?.profile?.evm_address) {
      navigate('/onboarding/start');
    }
  }, [userProfile, navigate, profileLoading]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PortfolioCards />

        <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
        </div>

        <div className="px-4 lg:px-6">
        <PortfolioPerformanceChart />
        </div>

        {/* Dashboard Widgets */}
        <div className="px-4 lg:px-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <RecentTransactionsWidget />
            <ActiveOrdersWidget />
          </div>
        </div>

        {/* Dashboard Charts */}
        <div className="px-4 lg:px-6">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            <div className="lg:col-span-1 xl:col-span-1">
              <MarketInsightsChart />
            </div>
            <div className="lg:col-span-2 xl:col-span-1">
              <PropertyAnalyticsChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
