import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type EVMNetwork } from "@/types/wallet"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const formatDate = (date?: Date | number | string) => {
    if (!date) return 'Unknown';
    
    // Handle Unix timestamp (number)
    if (typeof date === 'number') {
      // Convert seconds to milliseconds if needed (some APIs return seconds)
      const timestamp = date < 1e10 ? date * 1000 : date;
      return new Date(timestamp).toLocaleDateString();
    }
    
    // Handle string (assume ISO string)
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    }
    
    // Handle Date object
    return new Date(date).toLocaleDateString();
};

export const formatCurrency = (amount: number, locale: string = 'en-US', currencyCode: string = 'USD'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

export const getNetworkName = (network: EVMNetwork) => {
    const names = {
      'optimism-sepolia': 'Optimism Sepolia',
      'base-sepolia': 'Base Sepolia',
      'sepolia': 'Sepolia'
    };
    return names[network] || network;
  };

export const getNetworkColor = (network: EVMNetwork) => {
    const colors = {
      'optimism-sepolia': 'bg-red-100 text-red-800',
      'base-sepolia': 'bg-blue-100 text-blue-800',
      'sepolia': 'bg-gray-100 text-gray-800'
    };
    return colors[network] || 'bg-gray-100 text-gray-800';
  };

export const getExplorerUrl = (network: EVMNetwork, txHash: string): string => {
  const explorers = {
    'sepolia': `https://sepolia.etherscan.io/tx/${txHash}`,
    'base-sepolia': `https://sepolia.basescan.org/tx/${txHash}`,
    'optimism-sepolia': `https://sepolia-optimism.etherscan.io/tx/${txHash}`
  };
  
  return explorers[network] || `https://sepolia.etherscan.io/tx/${txHash}`;
};