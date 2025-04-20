// services/api.ts

import { CalculationError } from '../types/api';

// Use environment variables for the API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface CalculationResponse {
  transactions: {
    quantity: string;
    buyValue: string;
    sellValue: string;
    averageBuyPrice: string;
  }[];
  charges: {
    totalCharges: number;
    brokerage: number;
    [key: string]: number;
  };
  summary: {
    turnover: number;
    grossPnL: number;
    netPnL: number;
  };
}

export interface SaveTransactionResponse {
  status: string;
  message: string;
  group_id: number;
}

export const calculateCharges = async (
  platform: string,
  exchange: string,
  tradeType: string,
  transactions: Array<{
    quantity: string;
    buyPrice: string;
    sellPrice: string;
  }>
): Promise<CalculationResponse | CalculationError> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/calculate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        exchange,
        tradeType,
        transactions,
      }),
    });

    if (!response.ok) {
      return {
        error: `HTTP error! status: ${response.status}`,
        detail: await response.text(),
      };
    }

    return await response.json();
  } catch (error) {
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const saveTransactions = async (
  title: string,
  platform: string,
  exchange: string,
  tradeType: string,
  transactions: Array<{
    quantity: string;
    buyPrice: string;
    sellPrice: string;
  }>
): Promise<SaveTransactionResponse | CalculationError> => {
  try {
    const token = localStorage.getItem('auth_token'); // Get auth token
    
    const response = await fetch(`${API_BASE_URL}/api/save-calculation/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({
        title,
        platform,
        exchange,
        tradeType,
        transactions,
      }),
    });

    if (!response.ok) {
      return {
        error: `HTTP error! status: ${response.status}`,
        detail: await response.text(),
      };
    }

    return await response.json();
  } catch (error) {
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};