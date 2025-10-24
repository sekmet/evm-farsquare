/**
 * Price caching service to prevent API hammering
 * Implements in-memory caching with TTL
 */

interface CachedPrice {
  value: number;
  timestamp: number;
}

interface PriceCache {
  eth?: CachedPrice;
  pyusd?: CachedPrice;
  paxgold?: CachedPrice;
  optimism?: CachedPrice;
}

// Cache duration: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// In-memory cache
const priceCache: PriceCache = {};

const ETH_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
const PYUSD_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=paypal-usd&vs_currencies=usd";
const PAXGOLD_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd";
const OPTIMISM_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=optimism&vs_currencies=usd";

/**
 * Check if cached price is still valid
 */
const isCacheValid = (cached: CachedPrice | undefined): boolean => {
  if (!cached) return false;
  const now = Date.now();
  return now - cached.timestamp < CACHE_TTL;
};

/**
 * Fetch ETH price with caching
 */
export const fetchETHPrice = async (): Promise<number> => {
  // Return cached value if valid
  if (isCacheValid(priceCache.eth)) {
    console.log("Using cached ETH price:", priceCache.eth!.value);
    return priceCache.eth!.value;
  }

  console.log("Fetching fresh ETH price from CoinGecko...");
  
  try {
    const response = await fetch(ETH_PRICE_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch ETH price: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const value = Number(data?.ethereum?.usd);
    
    if (Number.isNaN(value)) {
      throw new Error("ETH price unavailable from provider response");
    }

    // Update cache
    priceCache.eth = {
      value,
      timestamp: Date.now(),
    };

    console.log("ETH price cached:", value);
    return value;
  } catch (error) {
    // If fetch fails but we have old cached data, use it
    if (priceCache.eth) {
      console.warn("ETH price fetch failed, using stale cache:", error);
      return priceCache.eth.value;
    }
    throw error;
  }
};

/**
 * Fetch PYUSD price with caching
 */
export const fetchPYUSDPrice = async (): Promise<number> => {
  // Return cached value if valid
  if (isCacheValid(priceCache.pyusd)) {
    console.log("Using cached PYUSD price:", priceCache.pyusd!.value);
    return priceCache.pyusd!.value;
  }

  console.log("Fetching fresh PYUSD price from CoinGecko...");
  
  try {
    const response = await fetch(PYUSD_PRICE_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch PYUSD price: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const value = Number(data['paypal-usd']?.usd);
    
    if (Number.isNaN(value)) {
      throw new Error("PYUSD price unavailable from provider response");
    }

    // Update cache
    priceCache.pyusd = {
      value,
      timestamp: Date.now(),
    };

    console.log("PYUSD price cached:", value);
    return value;
  } catch (error) {
    // If fetch fails but we have old cached data, use it
    if (priceCache.pyusd) {
      console.warn("PYUSD price fetch failed, using stale cache:", error);
      return priceCache.pyusd.value;
    }
    throw error;
  }
};


/**
 * Fetch PAXGOLD price with caching
 */
export const fetchPAXGOLDPrice = async (): Promise<number> => {
  // Return cached value if valid
  if (isCacheValid(priceCache.paxgold)) {
    console.log("Using cached PAXGOLD price:", priceCache.paxgold!.value);
    return priceCache.paxgold!.value;
  }

  console.log("Fetching fresh PAXGOLD price from CoinGecko...");
  
  try {
    const response = await fetch(PAXGOLD_PRICE_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch PAXGOLD price: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const value = Number(data['pax-gold']?.usd);
    
    if (Number.isNaN(value)) {
      throw new Error("PAXGOLD price unavailable from provider response");
    }

    // Update cache
    priceCache.paxgold = {
      value,
      timestamp: Date.now(),
    };

    console.log("PAXGOLD price cached:", value);
    return value;
  } catch (error) {
    // If fetch fails but we have old cached data, use it
    if (priceCache.paxgold) {
      console.warn("PAXGOLD price fetch failed, using stale cache:", error);
      return priceCache.paxgold.value;
    }
    throw error;
  }
};


/**
 * Fetch OPTIMISM price with caching
 */
export const fetchOPTIMISMPrice = async (): Promise<number> => {
  // Return cached value if valid
  if (isCacheValid(priceCache.optimism)) {
    console.log("Using cached OPTIMISM price:", priceCache.optimism!.value);
    return priceCache.optimism!.value;
  }

  console.log("Fetching fresh OPTIMISM price from CoinGecko...");
  
  try {
    const response = await fetch(OPTIMISM_PRICE_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch OPTIMISM price: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const value = Number(data?.optimism?.usd);
    
    if (Number.isNaN(value)) {
      throw new Error("OPTIMISM price unavailable from provider response");
    }

    // Update cache
    priceCache.optimism = {
      value,
      timestamp: Date.now(),
    };

    console.log("OPTIMISM price cached:", value);
    return value;
  } catch (error) {
    // If fetch fails but we have old cached data, use it
    if (priceCache.optimism) {
      console.warn("OPTIMISM price fetch failed, using stale cache:", error);
      return priceCache.optimism.value;
    }
    throw error;
  }
};

/**
 * Clear price cache (useful for testing or forced refresh)
 */
export const clearPriceCache = (): void => {
  priceCache.eth = undefined;
  priceCache.pyusd = undefined;
  priceCache.paxgold = undefined;
  priceCache.optimism = undefined;
  console.log("Price cache cleared");
};

/**
 * Get cache status (useful for debugging)
 */
export const getCacheStatus = () => {
  return {
    eth: priceCache.eth ? {
      value: priceCache.eth.value,
      age: Date.now() - priceCache.eth.timestamp,
      valid: isCacheValid(priceCache.eth),
    } : null,
    pyusd: priceCache.pyusd ? {
      value: priceCache.pyusd.value,
      age: Date.now() - priceCache.pyusd.timestamp,
      valid: isCacheValid(priceCache.pyusd),
    } : null,
    paxgold: priceCache.paxgold ? {
      value: priceCache.paxgold.value,
      age: Date.now() - priceCache.paxgold.timestamp,
      valid: isCacheValid(priceCache.paxgold),
    } : null,
    optimism: priceCache.optimism ? {
      value: priceCache.optimism.value,
      age: Date.now() - priceCache.optimism.timestamp,
      valid: isCacheValid(priceCache.optimism),
    } : null,
  };
};
