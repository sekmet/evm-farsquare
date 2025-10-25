import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type EVMNetwork } from "@/types/wallet"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const formatDate = (date?: Date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
  };

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