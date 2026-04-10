import axios from 'axios';
import { FREDResponse } from '../types';

const FRED_BASE = 'https://api.stlouisfed.org/fred';
const API_KEY = import.meta.env.VITE_FRED_API_KEY || '';

export async function fetchTreasuryRate(): Promise<{ rate: number; date: string }> {
  if (!API_KEY) {
    console.warn('[FRED] No API key, using mock treasury rate');
    return { rate: 4.35, date: '2025-12-01', isMock: true } as { rate: number; date: string };
  }

  try {
    const response = await axios.get<FREDResponse>(`${FRED_BASE}/series/observations`, {
      params: {
        series_id: 'DGS10',
        api_key: API_KEY,
        file_type: 'json',
        sort_order: 'desc',
        limit: 1,
      },
      timeout: 8000,
    });

    const obs = response.data?.observations?.[0];
    if (!obs || obs.value === '.') {
      return { rate: 4.35, date: new Date().toISOString().split('T')[0] };
    }

    return { rate: parseFloat(obs.value), date: obs.date };
  } catch (error) {
    console.warn('[FRED] Treasury rate fetch failed:', error);
    return { rate: 4.35, date: new Date().toISOString().split('T')[0] };
  }
}

export async function fetchCPIInflation(): Promise<{ cpi: number; date: string }> {
  if (!API_KEY) {
    console.warn('[FRED] No API key, using mock CPI');
    return { cpi: 2.9, date: '2025-12-01', isMock: true } as { cpi: number; date: string };
  }

  try {
    const response = await axios.get<FREDResponse>(`${FRED_BASE}/series/observations`, {
      params: {
        series_id: 'CPIAUCSL',
        api_key: API_KEY,
        file_type: 'json',
        sort_order: 'desc',
        limit: 13, // need 13 to compute 12-month change
      },
      timeout: 8000,
    });

    const observations = response.data?.observations || [];
    if (observations.length < 2) {
      return { cpi: 2.9, date: new Date().toISOString().split('T')[0] };
    }

    const latest = parseFloat(observations[0].value);
    const yearAgo = parseFloat(observations[12]?.value || observations[observations.length - 1].value);

    const yoyCPI = ((latest - yearAgo) / yearAgo) * 100;

    return { cpi: yoyCPI, date: observations[0].date };
  } catch (error) {
    console.warn('[FRED] CPI fetch failed:', error);
    return { cpi: 2.9, date: new Date().toISOString().split('T')[0] };
  }
}
