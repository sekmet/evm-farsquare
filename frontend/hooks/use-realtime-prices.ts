import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type Address } from 'viem';
import { getContractActivity } from '@/lib/evm-client-api';

const WS_URL = import.meta.env.VITE_BASE_WS_URL || 'ws://localhost:3002';

/**
 * Calculate price impact from contract activity
 */
function calculatePriceImpact(activity: { transferCount: number; volume24h: number; activeUsers: number }): number {
  // Simple price impact calculation based on activity
  // In production, this would use more sophisticated models
  const volumeImpact = Math.min(activity.volume24h / 1000000, 0.05); // Max 5% impact
  const userImpact = Math.min(activity.activeUsers / 100, 0.03); // Max 3% impact
  const transferImpact = Math.min(activity.transferCount / 1000, 0.02); // Max 2% impact

  return volumeImpact + userImpact + transferImpact;
}

interface PriceUpdate {
  propertyId: string;
  tokenPrice: number;
  priceChange24h: number;
  volume24h: number;
  marketCap?: number;
  contractActivity?: number;
  lastUpdated: Date;
  contractValidated?: boolean;
  liquidityDepth?: number;
}

interface UseRealTimePricesReturn {
  isConnected: boolean;
  reconnect: () => void;
  lastUpdate: Date | null;
}

export function useRealTimePrices(): UseRealTimePricesReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (socketRef.current?.readyState === WebSocket.OPEN || 
        socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Close existing socket if any
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const ws = new WebSocket(`${WS_URL}/prices`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to real-time pricing service');
      setIsConnected(true);
      setLastUpdate(new Date());
    };

    ws.onmessage = async (event) => {
      try {
        const updates: PriceUpdate[] = JSON.parse(event.data);

        // Process updates with enhanced EVM contract monitoring
        const enhancedUpdates = await Promise.all(
          updates.map(async (update) => {
            let enhancedUpdate = { ...update };

            // Try to get property data to access contract address
            try {
              const propertyResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${update.propertyId}`);
              if (propertyResponse.ok) {
                const propertyData = await propertyResponse.json();
                if (propertyData.success && propertyData.data.contract_address?.startsWith('0x')) {
                  const contractAddress = propertyData.data.contract_address as Address;

                  // Get real-time contract activity
                  const activity = await getContractActivity(contractAddress);

                  // Calculate price impact from contract activity
                  const priceImpact = calculatePriceImpact(activity);

                  // Enhance update with contract data
                  enhancedUpdate = {
                    ...enhancedUpdate,
                    volume24h: activity.volume24h || enhancedUpdate.volume24h,
                    contractActivity: activity.transferCount,
                    contractValidated: true,
                    liquidityDepth: activity.activeUsers,
                    // Apply price impact to create more realistic price movements
                    tokenPrice: enhancedUpdate.tokenPrice * (1 + priceImpact * 0.1), // 10% of impact
                  };

                  console.log(`Contract activity for ${update.propertyId}:`, {
                    transfers: activity.transferCount,
                    volume: activity.volume24h,
                    users: activity.activeUsers,
                    priceImpact: (priceImpact * 100).toFixed(2) + '%'
                  });
                }
              }
            } catch (contractError) {
              console.warn(`Failed to get contract activity for ${update.propertyId}:`, contractError);
              // Continue with original update data
            }

            return enhancedUpdate;
          })
        );

        // Update query cache with enhanced data
        enhancedUpdates.forEach(update => {
          queryClient.setQueryData(['property', update.propertyId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              marketData: {
                ...oldData.marketData,
                currentPrice: update.tokenPrice,
                priceChange24h: update.priceChange24h,
                volume24h: update.volume24h,
                marketCap: update.marketCap,
                contractActivity: update.contractActivity,
                contractValidated: update.contractValidated,
                liquidityDepth: update.liquidityDepth,
                lastUpdated: update.lastUpdated,
              },
            };
          });

          // Update property in lists
          queryClient.setQueriesData({ queryKey: ['properties'] }, (oldData: any) => {
            if (!oldData) return oldData;
            return oldData.map((property: any) => {
              if (property.id === update.propertyId) {
                return {
                  ...property,
                  token_price: update.tokenPrice,
                  price_change_24h: update.priceChange24h,
                  volume_24h: update.volume24h,
                  market_cap: update.marketCap,
                  contract_activity: update.contractActivity,
                  contract_validated: update.contractValidated,
                  liquidity_depth: update.liquidityDepth,
                  updated_at: update.lastUpdated,
                };
              }
              return property;
            });
          });
        });

        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from real-time pricing service');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, [queryClient]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  // Auto-reconnect on connection loss
  useEffect(() => {
    if (!isConnected && 
        socketRef.current?.readyState !== WebSocket.CONNECTING && 
        socketRef.current?.readyState !== WebSocket.OPEN) {
      
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect to pricing service...');
        connect();
      }, 5000);

      return () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
    }
  }, [isConnected, connect]);

  return {
    isConnected,
    reconnect,
    lastUpdate,
  };
}

// Hook for subscribing to specific property price updates
export function usePropertyPrice(propertyId: string): PriceUpdate | null {
  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Close existing connection if propertyId changes
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const ws = new WebSocket(`${WS_URL}/property/${propertyId}/price`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to price updates for property ${propertyId}`);
    };

    ws.onmessage = (event) => {
      try {
        const update: PriceUpdate = JSON.parse(event.data);
        setPrice(update);
      } catch (error) {
        console.error('Failed to parse property price update:', error);
      }
    };

    ws.onclose = () => {
      console.log(`Disconnected from property ${propertyId} price updates`);
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for property ${propertyId}:`, error);
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [propertyId]);

  return price;
}
