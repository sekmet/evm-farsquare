/**
 * Price caching service to prevent API hammering
 * Implements in-memory caching with TTL
 */

// Type definitions for CoinGecko API responses
interface CoinGeckoSimplePriceResponse {
  [key: string]: {
    usd: number;
  };
}

interface CachedPrice {
  value: number;
  timestamp: number;
}

interface PriceCache {
  eth?: CachedPrice;
  pyusd?: CachedPrice;
  paxgold?: CachedPrice;
  optimism?: CachedPrice;
  usdc?: CachedPrice;
  eurc?: CachedPrice;
}

// Cache duration: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// In-memory cache
const priceCache: PriceCache = {};

const ETH_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
const PYUSD_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=paypal-usd&vs_currencies=usd";
const PAXGOLD_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd";
const OPTIMISM_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=optimism&vs_currencies=usd";
const USDC_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd";
const EURC_PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=euro-coin&vs_currencies=usd";

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
    
    const data = await response.json() as CoinGeckoSimplePriceResponse;
    const ethereumData = data.ethereum;
    if (!ethereumData || typeof ethereumData.usd !== 'number') {
      throw new Error("ETH price data unavailable from provider response");
    }
    const value = Number(ethereumData.usd);
    
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
    
    const data = await response.json() as CoinGeckoSimplePriceResponse;
    const pyusdData = data['paypal-usd'];
    if (!pyusdData || typeof pyusdData.usd !== 'number') {
      throw new Error("PYUSD price data unavailable from provider response");
    }
    const value = Number(pyusdData.usd);
    
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
    
    const data = await response.json() as CoinGeckoSimplePriceResponse;
    const paxgoldData = data['pax-gold'];
    if (!paxgoldData || typeof paxgoldData.usd !== 'number') {
      throw new Error("PAXGOLD price data unavailable from provider response");
    }
    const value = Number(paxgoldData.usd);
    
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
 * Fetch USDC price with caching
 */
export const fetchUSDCPrice = async (): Promise<number> => {
  // Return cached value if valid
  if (isCacheValid(priceCache.usdc)) {
    console.log("Using cached USDC price:", priceCache.usdc!.value);
    return priceCache.usdc!.value;
  }

  console.log("Fetching fresh USDC price from CoinGecko...");
  
  try {
    const response = await fetch(USDC_PRICE_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch USDC price: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as CoinGeckoSimplePriceResponse;
    const usdcData = data['usd-coin'];
    if (!usdcData || typeof usdcData.usd !== 'number') {
      throw new Error("USDC price data unavailable from provider response");
    }
    const value = Number(usdcData.usd);
    
    if (Number.isNaN(value)) {
      throw new Error("USDC price unavailable from provider response");
    }

    // Update cache
    priceCache.usdc = {
      value,
      timestamp: Date.now(),
    };

    console.log("USDC price cached:", value);
    return value;
  } catch (error) {
    // If fetch fails but we have old cached data, use it
    if (priceCache.usdc) {
      console.warn("USDC price fetch failed, using stale cache:", error);
      return priceCache.usdc.value;
    }
    throw error;
  }
};

/**
 * Fetch Optimism price with caching
 */
export const fetchOptimismPrice = async (): Promise<number> => {
  // Return cached value if valid
  if (isCacheValid(priceCache.optimism)) {
    console.log("Using cached Optimism price:", priceCache.optimism!.value);
    return priceCache.optimism!.value;
  }

  console.log("Fetching fresh Optimism price from CoinGecko...");
  
  try {
    const response = await fetch(OPTIMISM_PRICE_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch Optimism price: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as CoinGeckoSimplePriceResponse;
    const optimismData = data.optimism;
    if (!optimismData || typeof optimismData.usd !== 'number') {
      throw new Error("Optimism price data unavailable from provider response");
    }
    const value = Number(optimismData.usd);
    
    if (Number.isNaN(value)) {
      throw new Error("Optimism price unavailable from provider response");
    }

    // Update cache
    priceCache.optimism = {
      value,
      timestamp: Date.now(),
    };

    console.log("Optimism price cached:", value);
    return value;
  } catch (error) {
    // If fetch fails but we have old cached data, use it
    if (priceCache.optimism) {
      console.warn("Optimism price fetch failed, using stale cache:", error);
      return priceCache.optimism.value;
    }
    throw error;
  }
};

/**
 * Fetch EURC price with caching
 */
export const fetchEURCPrice = async (): Promise<number> => {
  // Return cached value if valid
  if (isCacheValid(priceCache.eurc)) {
    console.log("Using cached EURC price:", priceCache.eurc!.value);
    return priceCache.eurc!.value;
  }

  console.log("Fetching fresh EURC price from CoinGecko...");
  
  try {
    const response = await fetch(EURC_PRICE_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch EURC price: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as CoinGeckoSimplePriceResponse;
    const eurcData = data['euro-coin'];
    if (!eurcData || typeof eurcData.usd !== 'number') {
      throw new Error("EURC price data unavailable from provider response");
    }
    const value = Number(eurcData.usd);
    
    if (Number.isNaN(value)) {
      throw new Error("EURC price unavailable from provider response");
    }

    // Update cache
    priceCache.eurc = {
      value,
      timestamp: Date.now(),
    };

    console.log("EURC price cached:", value);
    return value;
  } catch (error) {
    // If fetch fails but we have old cached data, use it
    if (priceCache.eurc) {
      console.warn("EURC price fetch failed, using stale cache:", error);
      return priceCache.eurc.value;
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
  priceCache.usdc = undefined;
  priceCache.eurc = undefined;
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
    usdc: priceCache.usdc ? {
      value: priceCache.usdc.value,
      age: Date.now() - priceCache.usdc.timestamp,
      valid: isCacheValid(priceCache.usdc),
    } : null,
    eurc: priceCache.eurc ? {
      value: priceCache.eurc.value,
      age: Date.now() - priceCache.eurc.timestamp,
      valid: isCacheValid(priceCache.eurc),
    } : null,
  };
};
