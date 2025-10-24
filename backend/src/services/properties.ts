import { Pool } from 'pg';

export interface Property {
  id: string;
  contract_address: string;
  token_symbol: string;
  name: string;
  description: string;
  location: string;
  property_type: 'residential' | 'commercial' | 'mixed';
  total_tokens: number;
  available_tokens: number;
  token_price: number;
  total_value: number;
  annual_yield: number;
  risk_level: 'low' | 'medium' | 'high';
  features: string[];
  images: string[];
  funding_progress: number;
  minimum_investment: number;
  status: 'active' | 'funded' | 'cancelled' | 'archived';
  created_at: Date;
  updated_at: Date;
  weekly_volume?: number;
  avg_price_7d?: number;
  max_investors_7d?: number;
  owner_user_id?: string;
  owner_address?: string;
}

export interface MarketplaceListing {
  id: string;
  property_id: string;
  seller_address: string;
  listing_price: number;
  token_quantity: number;
  available_quantity: number;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  property_name?: string;
  location?: string;
  property_type?: string;
  annual_yield?: number;
  risk_level?: string;
  primary_image?: string;
}

export interface UserPortfolio {
  id: string;
  wallet_address: string;
  property_id: string;
  token_quantity: number;
  average_purchase_price: number;
  total_investment: number;
  created_at: Date;
  updated_at: Date;
  property_name?: string;
  property_symbol?: string;
}

export class PropertiesService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getAllProperties(): Promise<Property[]> {
    const query = `
      SELECT 
        p.*,
        po.user_id as owner_user_id,
        u.evm_address as owner_address
      FROM public.properties p
      LEFT JOIN public.property_ownership po ON p.id = po.property_id AND po.ownership_type = 'owner'
      LEFT JOIN public.profiles u ON po.user_id::text = u.id::text
      ORDER BY p.funding_progress DESC, p.created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(this.mapPropertyRow);
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const query = `
      SELECT * FROM public.properties
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapPropertyRow(result.rows[0]) : null;
  }

  async getPropertiesByType(type: string): Promise<Property[]> {
    const query = `
      SELECT * FROM public.properties
      WHERE property_type = $1
      ORDER BY funding_progress DESC, created_at DESC
    `;

    const result = await this.pool.query(query, [type]);
    return result.rows.map(this.mapPropertyRow);
  }

  async getPropertiesByRisk(risk: string): Promise<Property[]> {
    const query = `
      SELECT * FROM public.properties
      WHERE risk_level = $1
      ORDER BY funding_progress DESC, created_at DESC
    `;

    const result = await this.pool.query(query, [risk]);
    return result.rows.map(this.mapPropertyRow);
  }

  async getMarketplaceListings(): Promise<MarketplaceListing[]> {
    const query = `
      SELECT * FROM public.marketplace_listings
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(this.mapMarketplaceListingRow);
  }

  async getMarketplaceListingById(id: string): Promise<MarketplaceListing | null> {
    const query = `
      SELECT * FROM public.marketplace_listings
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapMarketplaceListingRow(result.rows[0]) : null;
  }

  async getUserPortfolio(walletAddress: string): Promise<UserPortfolio[]> {
    const query = `
      SELECT
        up.*,
        p.name as property_name,
        p.token_symbol as property_symbol
      FROM public.user_portfolios up
      JOIN public.properties p ON up.property_id = p.id
      WHERE up.wallet_address = $1
      ORDER BY up.total_investment DESC
    `;

    const result = await this.pool.query(query, [walletAddress]);
    return result.rows.map(this.mapUserPortfolioRow);
  }

  async purchaseTokens(
    propertyId: string,
    walletAddress: string,
    quantity: number,
    price: number
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if property exists and has enough tokens
      const propertyQuery = `
        SELECT available_tokens, token_price FROM public.properties
        WHERE id = $1 AND status = 'active' FOR UPDATE
      `;

      const propertyResult = await client.query(propertyQuery, [propertyId]);

      if (propertyResult.rows.length === 0) {
        throw new Error('Property not found');
      }

      const property = propertyResult.rows[0];

      if (property.available_tokens < quantity) {
        throw new Error('Not enough tokens available');
      }

      // Update property available tokens
      const updatePropertyQuery = `
        UPDATE public.properties
        SET available_tokens = available_tokens - $1,
            funding_progress = CASE
              WHEN total_tokens > 0 THEN
                ROUND(((total_tokens - available_tokens + $1) * 100.0 / total_tokens))
              ELSE 0
            END,
            updated_at = NOW()
        WHERE id = $2
      `;

      await client.query(updatePropertyQuery, [quantity, propertyId]);

      // Add or update user portfolio
      const portfolioQuery = `
        INSERT INTO public.user_portfolios (wallet_address, property_id, token_quantity, average_purchase_price, total_investment)
        VALUES ($1, $2, $3,
          CASE
            WHEN EXISTS(SELECT 1 FROM public.user_portfolios WHERE wallet_address = $1 AND property_id = $2)
            THEN (SELECT average_purchase_price FROM public.user_portfolios WHERE wallet_address = $1 AND property_id = $2)
            ELSE $4
          END,
          $3 * $4
        )
        ON CONFLICT (wallet_address, property_id)
        DO UPDATE SET
          token_quantity = user_portfolios.token_quantity + $3,
          average_purchase_price = ($3 * $4 + user_portfolios.token_quantity * user_portfolios.average_purchase_price) / (user_portfolios.token_quantity + $3),
          total_investment = (user_portfolios.token_quantity + $3) * (($3 * $4 + user_portfolios.token_quantity * user_portfolios.average_purchase_price) / (user_portfolios.token_quantity + $3)),
          updated_at = NOW()
      `;

      await client.query(portfolioQuery, [walletAddress, propertyId, quantity, price]);

      // Add analytics entry
      const analyticsQuery = `
        INSERT INTO public.property_analytics (property_id, date, price, volume, investors_count, funding_percentage)
        VALUES ($1, CURRENT_DATE, $2, $3, 1, (
          SELECT ROUND(((total_tokens - available_tokens) * 100.0 / total_tokens))
          FROM public.properties WHERE id = $1
        ))
        ON CONFLICT (property_id, date)
        DO UPDATE SET
          volume = property_analytics.volume + $3,
          investors_count = property_analytics.investors_count + 1
      `;

      await client.query(analyticsQuery, [propertyId, price, quantity]);

      await client.query('COMMIT');
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error purchasing tokens:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async createMarketplaceListing(
    propertyId: string,
    sellerAddress: string,
    price: number,
    quantity: number
  ): Promise<string> {
    const query = `
      INSERT INTO public.marketplace_listings (property_id, seller_address, listing_price, token_quantity, available_quantity, expires_at)
      VALUES ($1, $2, $3, $4, $4, NOW() + INTERVAL '30 days')
      RETURNING id
    `;

    const result = await this.pool.query(query, [propertyId, sellerAddress, price, quantity]);
    return result.rows[0].id;
  }

  async searchProperties(filters: any): Promise<Property[]> {
    let query = `
      SELECT * FROM public.properties
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.propertyType && filters.propertyType !== 'all') {
      query += ` AND property_type = $${paramIndex}`;
      params.push(filters.propertyType);
      paramIndex++;
    }

    if (filters.priceRange && filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(Number);
      query += ` AND token_price BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(min, max);
      paramIndex += 2;
    }

    if (filters.yieldRange && filters.yieldRange !== 'all') {
      const [_, min] = filters.yieldRange.split('-').map(Number);
      query += ` AND annual_yield >= $${paramIndex}`;
      params.push(min);
      paramIndex++;
    }

    if (filters.riskLevel && filters.riskLevel !== 'all') {
      query += ` AND risk_level = $${paramIndex}`;
      params.push(filters.riskLevel);
      paramIndex++;
    }

    query += ` ORDER BY funding_progress DESC, created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(this.mapPropertyRow);
  }

  async checkPropertyCompliance(propertyId: string, userId: string): Promise<any> {
    // Mock detailed ERC-3643 compliance check - in real implementation, check against permission registry
    try {
      // Simulate comprehensive compliance verification
      const mockComplianceData = {
        overallEligible: true, // Mock - would check all requirements
        requirements: {
          kyc: {
            status: 'approved',
            completedAt: '2025-01-15T10:30:00Z',
            provider: 'Identity Verification Service'
          },
          accreditation: {
            status: 'approved',
            completedAt: '2025-01-10T14:20:00Z',
            level: 'individual'
          },
          jurisdiction: {
            status: 'eligible',
            allowedCountries: ['US', 'CA', 'GB', 'DE'],
            userCountry: 'US'
          },
          investmentLimits: {
            status: 'within_limits',
            currentInvestment: 25000,
            maxInvestment: 100000,
            period: 'yearly'
          },
          tokenHolding: {
            status: 'eligible',
            currentHoldings: 150,
            maxHoldings: 1000
          }
        },
        nextSteps: [],
        documents: [
          {
            name: 'KYC Verification',
            status: 'approved',
            submittedAt: '2025-01-15T10:30:00Z',
            reviewedAt: '2025-01-15T11:00:00Z'
          },
          {
            name: 'Accreditation Certificate',
            status: 'approved',
            submittedAt: '2025-01-10T14:20:00Z',
            reviewedAt: '2025-01-10T15:30:00Z'
          }
        ],
        lastUpdated: new Date().toISOString()
      };

      return mockComplianceData;
    } catch (error) {
      console.error('Detailed compliance check error:', error);
      return {
        overallEligible: false,
        requirements: {},
        nextSteps: ['Unable to verify compliance status. Please contact support.'],
        documents: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async getPropertyMarketData(propertyId: string): Promise<any> {
    // Get current market data for the property
    const query = `
      SELECT
        p.token_price,
        p.annual_yield,
        p.total_tokens,
        p.available_tokens,
        p.funding_progress,
        COALESCE(a.price, 0) as current_price,
        COALESCE(a.volume, 0) as daily_volume,
        COALESCE(a.investors_count, 0) as investors_count
      FROM public.properties p
      LEFT JOIN public.property_analytics a ON p.id = a.property_id
        AND a.date = CURRENT_DATE
      WHERE p.id = $1
    `;

    const result = await this.pool.query(query, [propertyId]);
    return result.rows[0] || null;
  }

  async getPropertyOwnerData(propertyId: string): Promise<any> {
    // Get owner-specific data for property management
    const query = `
      SELECT
        p.*,
        COUNT(DISTINCT up.wallet_address) as investor_count,
        COALESCE(SUM(up.total_investment), 0) as total_raised,
        0 as document_count
      FROM public.properties p
      LEFT JOIN public.user_portfolios up ON p.id = up.property_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await this.pool.query(query, [propertyId]);
    return result.rows[0] || null;
  }

  async updatePropertyDetails(propertyId: string, updates: any): Promise<any> {
    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `
      UPDATE public.properties
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [propertyId, ...values]);
    return result.rows[0];
  }

  async uploadPropertyDocument(propertyId: string, file: File): Promise<any> {
    // In a real implementation, you'd upload the file to cloud storage
    // For now, we'll just simulate the upload without database storage
    const fileName = file.name;
    const fileSize = file.size;
    const fileType = file.type;

    // Mock successful upload response
    return {
      id: 'mock-document-id',
      propertyId,
      name: fileName,
      filePath: `/uploads/${fileName}`,
      documentType: fileType,
      uploadedBy: 'mock-user-id',
      uploadedAt: new Date().toISOString()
    };
  }

  async mintPropertyTokens(propertyId: string, amount: number): Promise<any> {
    // Update property total tokens
    const query = `
      UPDATE public.properties
      SET total_tokens = total_tokens + $1,
          available_tokens = available_tokens + $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [amount, propertyId]);

    // Log the token operation (mock implementation)
    console.log(`Minted ${amount} tokens for property ${propertyId}`);

    return result.rows[0];
  }

  async sendInvestorMessage(propertyId: string, message: any): Promise<any> {
    // Get all investors for this property
    const investorQuery = `
      SELECT DISTINCT wallet_address
      FROM public.user_portfolios
      WHERE property_id = $1
    `;

    const investors = await this.pool.query(investorQuery, [propertyId]);

    // Mock message sending - in a real implementation, you'd send actual emails/notifications
    console.log(`Message sent to ${investors.rows.length} investors:`, message.subject);

    return {
      id: 'mock-message-id',
      propertyId,
      senderId: 'mock-user-id',
      subject: message.subject,
      message: message.message,
      recipientType: message.recipientType,
      sentAt: new Date().toISOString(),
      recipientCount: investors.rows.length
    };
  }

  private mapPropertyRow(row: any): Property {
    return {
      id: row.id,
      contract_address: row.contract_address,
      token_symbol: row.token_symbol,
      name: row.name,
      description: row.description,
      location: row.location,
      property_type: row.property_type,
      total_tokens: parseInt(row.total_tokens),
      available_tokens: parseInt(row.available_tokens),
      token_price: parseFloat(row.token_price),
      total_value: parseFloat(row.total_value),
      annual_yield: parseFloat(row.annual_yield),
      risk_level: row.risk_level,
      features: row.features || [],
      images: row.images || [],
      funding_progress: parseInt(row.funding_progress),
      minimum_investment: parseFloat(row.minimum_investment),
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      weekly_volume: row.weekly_volume ? parseInt(row.weekly_volume) : undefined,
      avg_price_7d: row.avg_price_7d ? parseFloat(row.avg_price_7d) : undefined,
      max_investors_7d: row.max_investors_7d ? parseInt(row.max_investors_7d) : undefined,
      owner_user_id: row.owner_user_id,
      owner_address: row.owner_address,
    };
  }

  private mapMarketplaceListingRow(row: any): MarketplaceListing {
    return {
      id: row.id,
      property_id: row.property_id,
      seller_address: row.seller_address,
      listing_price: parseFloat(row.listing_price),
      token_quantity: parseInt(row.token_quantity),
      available_quantity: parseInt(row.available_quantity),
      status: row.status,
      expires_at: new Date(row.expires_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      property_name: row.property_name,
      location: row.location,
      property_type: row.property_type,
      annual_yield: row.annual_yield ? parseFloat(row.annual_yield) : undefined,
      risk_level: row.risk_level,
      primary_image: row.primary_image,
    };
  }

  private mapUserPortfolioRow(row: any): UserPortfolio {
    return {
      id: row.id,
      wallet_address: row.wallet_address,
      property_id: row.property_id,
      token_quantity: parseInt(row.token_quantity),
      average_purchase_price: parseFloat(row.average_purchase_price),
      total_investment: parseFloat(row.total_investment),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      property_name: row.property_name,
      property_symbol: row.property_symbol,
    };
  }
}
