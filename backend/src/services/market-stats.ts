import { Pool } from "pg";

export interface MarketStats {
  totalProperties: number;
  averageYield: number;
  totalValue: number;
  activeInvestors: number;
}

export type MarketStatsResult =
  | { success: true; data: MarketStats }
  | { success: false; error: string };

export class MarketStatsService {
  constructor(private pool: Pool) {}

  async getMarketStats(): Promise<MarketStatsResult> {
    try {
      // Get total active properties
      const totalPropertiesQuery = `
        SELECT COUNT(*) as count
        FROM public.properties
        WHERE status = 'active'
      `;
      const totalPropertiesResult = await this.pool.query(totalPropertiesQuery);

      // Get average yield
      const averageYieldQuery = `
        SELECT AVG(annual_yield) as avg_yield
        FROM public.properties
        WHERE status = 'active'
      `;
      const averageYieldResult = await this.pool.query(averageYieldQuery);

      // Get total value
      const totalValueQuery = `
        SELECT SUM(total_value) as sum_value
        FROM public.properties
        WHERE status = 'active'
      `;
      const totalValueResult = await this.pool.query(totalValueQuery);

      // Get active investors
      const activeInvestorsQuery = `
        SELECT COUNT(DISTINCT wallet_address) as count
        FROM public.user_portfolios
      `;
      const activeInvestorsResult = await this.pool.query(activeInvestorsQuery);

      const stats: MarketStats = {
        totalProperties: parseInt(totalPropertiesResult.rows[0]?.count || '0'),
        averageYield: parseFloat(averageYieldResult.rows[0]?.avg_yield || '0') || 0,
        totalValue: parseFloat(totalValueResult.rows[0]?.sum_value || '0') || 0,
        activeInvestors: parseInt(activeInvestorsResult.rows[0]?.count || '0'),
      };

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown database error"
      };
    }
  }
}