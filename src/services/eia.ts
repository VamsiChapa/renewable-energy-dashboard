import axios from 'axios';
import { EIAResponse, PriceHistoryPoint, CapacityHistoryPoint } from '../types';

const EIA_BASE = 'https://api.eia.gov/v2';
const API_KEY = import.meta.env.VITE_EIA_API_KEY || '';

// Mock data fallback for when no API key is provided or API fails
export const MOCK_PRICE_HISTORY: PriceHistoryPoint[] = [
  { period: '2024-01', price: 12.4 },
  { period: '2024-02', price: 12.1 },
  { period: '2024-03', price: 11.8 },
  { period: '2024-04', price: 11.6 },
  { period: '2024-05', price: 12.0 },
  { period: '2024-06', price: 13.2 },
  { period: '2024-07', price: 14.1 },
  { period: '2024-08', price: 13.8 },
  { period: '2024-09', price: 12.9 },
  { period: '2024-10', price: 12.2 },
  { period: '2024-11', price: 11.9 },
  { period: '2024-12', price: 12.5 },
  { period: '2025-01', price: 12.6 },
  { period: '2025-02', price: 12.3 },
  { period: '2025-03', price: 12.0 },
  { period: '2025-04', price: 11.7 },
  { period: '2025-05', price: 12.1 },
  { period: '2025-06', price: 13.4 },
  { period: '2025-07', price: 14.3 },
  { period: '2025-08', price: 13.9 },
  { period: '2025-09', price: 13.1 },
  { period: '2025-10', price: 12.4 },
  { period: '2025-11', price: 12.0 },
  { period: '2025-12', price: 12.7 },
];

export const MOCK_CAPACITY_HISTORY: CapacityHistoryPoint[] = [
  { year: 2015, solar: 25.6, wind: 73.9 },
  { year: 2016, solar: 42.1, wind: 82.2 },
  { year: 2017, solar: 52.9, wind: 89.4 },
  { year: 2018, solar: 62.5, wind: 96.7 },
  { year: 2019, solar: 77.0, wind: 105.6 },
  { year: 2020, solar: 97.2, wind: 121.9 },
  { year: 2021, solar: 121.4, wind: 133.7 },
  { year: 2022, solar: 153.8, wind: 141.0 },
  { year: 2023, solar: 193.0, wind: 150.1 },
  { year: 2024, solar: 230.5, wind: 158.3 },
];

export const MOCK_STATE_PRICES: Record<string, number> = {
  AL: 12.8, AK: 22.4, AZ: 11.3, AR: 10.9, CA: 22.1, CO: 12.4, CT: 25.1,
  DE: 13.2, FL: 11.8, GA: 11.6, HI: 38.5, ID: 9.3, IL: 12.1, IN: 11.4,
  IA: 10.8, KS: 10.6, KY: 10.2, LA: 9.8, ME: 18.9, MD: 14.2, MA: 23.4,
  MI: 14.1, MN: 12.3, MS: 11.2, MO: 11.0, MT: 10.4, NE: 10.7, NV: 11.5,
  NH: 20.1, NJ: 17.8, NM: 11.9, NY: 18.6, NC: 11.3, ND: 10.1, OH: 12.8,
  OK: 9.9, OR: 10.5, PA: 14.3, RI: 22.7, SC: 11.8, SD: 10.3, TN: 10.6,
  TX: 11.0, UT: 10.8, VT: 19.2, VA: 12.1, WA: 9.7, WV: 11.5, WI: 13.4,
  WY: 10.2,
};

export async function fetchElectricityPrices(): Promise<{
  avgPrice: number;
  priceHistory: PriceHistoryPoint[];
  yoyChange: number;
}> {
  if (!API_KEY) {
    console.warn('[EIA] No API key, using mock data');
    return getMockPriceData();
  }

  try {
    const url = `${EIA_BASE}/electricity/retail-sales/data/`;
    const response = await axios.get<EIAResponse>(url, {
      params: {
        api_key: API_KEY,
        frequency: 'monthly',
        'data[0]': 'price',
        'facets[sectorName][]': 'all',
        'sort[0][column]': 'period',
        'sort[0][direction]': 'desc',
        length: 24,
      },
      timeout: 10000,
    });

    const data = response.data?.response?.data || [];
    if (data.length === 0) return getMockPriceData();

    // Group by period, average across sectors
    const byPeriod = new Map<string, number[]>();
    data.forEach((d) => {
      if (d.price && d.period) {
        if (!byPeriod.has(d.period)) byPeriod.set(d.period, []);
        byPeriod.get(d.period)!.push(Number(d.price));
      }
    });

    const priceHistory: PriceHistoryPoint[] = Array.from(byPeriod.entries())
      .map(([period, prices]) => ({
        period,
        price: prices.reduce((a, b) => a + b, 0) / prices.length,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const latestPrice = priceHistory[priceHistory.length - 1]?.price ?? 12.5;
    const yearAgoPrice = priceHistory[priceHistory.length - 13]?.price ?? latestPrice;
    const yoyChange = ((latestPrice - yearAgoPrice) / yearAgoPrice) * 100;

    return { avgPrice: latestPrice, priceHistory, yoyChange };
  } catch (error) {
    console.warn('[EIA] Price fetch failed, using mock data:', error);
    return getMockPriceData();
  }
}

function getMockPriceData() {
  const latestPrice = MOCK_PRICE_HISTORY[MOCK_PRICE_HISTORY.length - 1].price;
  const yearAgoPrice = MOCK_PRICE_HISTORY[MOCK_PRICE_HISTORY.length - 13].price;
  const yoyChange = ((latestPrice - yearAgoPrice) / yearAgoPrice) * 100;
  return {
    avgPrice: latestPrice,
    priceHistory: [...MOCK_PRICE_HISTORY],
    yoyChange,
    isMock: true,
  };
}

export async function fetchCapacityData(): Promise<{
  solarGW: number;
  windGW: number;
  capacityHistory: CapacityHistoryPoint[];
  solarYoYChange: number;
  windYoYChange: number;
}> {
  if (!API_KEY) {
    console.warn('[EIA] No API key, using mock capacity data');
    return getMockCapacityData();
  }

  try {
    const url = `${EIA_BASE}/electricity/electric-power-operational-data/data/`;
    const response = await axios.get<EIAResponse>(url, {
      params: {
        api_key: API_KEY,
        frequency: 'annual',
        'data[0]': 'nameplate-capacity-mw',
        'facets[fueltypeid][]': ['SUN', 'WND'],
        'sort[0][column]': 'period',
        'sort[0][direction]': 'desc',
        length: 20,
      },
      timeout: 10000,
    });

    const data = response.data?.response?.data || [];
    if (data.length === 0) return getMockCapacityData();

    // Aggregate by year and fuel type
    const byYearFuel = new Map<string, { solar: number; wind: number }>();
    data.forEach((d) => {
      const year = d.period;
      const capacity = Number(d['nameplate-capacity-mw'] || 0);
      if (!byYearFuel.has(year)) byYearFuel.set(year, { solar: 0, wind: 0 });
      const entry = byYearFuel.get(year)!;
      if (d.fueltypeid === 'SUN') entry.solar += capacity;
      if (d.fueltypeid === 'WND') entry.wind += capacity;
    });

    const capacityHistory: CapacityHistoryPoint[] = Array.from(byYearFuel.entries())
      .map(([year, v]) => ({
        year: parseInt(year),
        solar: v.solar / 1000, // MW to GW
        wind: v.wind / 1000,
      }))
      .sort((a, b) => a.year - b.year);

    const latest = capacityHistory[capacityHistory.length - 1];
    const prev = capacityHistory[capacityHistory.length - 2];

    const solarYoYChange = prev ? ((latest.solar - prev.solar) / prev.solar) * 100 : 0;
    const windYoYChange = prev ? ((latest.wind - prev.wind) / prev.wind) * 100 : 0;

    return {
      solarGW: latest.solar,
      windGW: latest.wind,
      capacityHistory,
      solarYoYChange,
      windYoYChange,
    };
  } catch (error) {
    console.warn('[EIA] Capacity fetch failed, using mock data:', error);
    return getMockCapacityData();
  }
}

function getMockCapacityData() {
  const latest = MOCK_CAPACITY_HISTORY[MOCK_CAPACITY_HISTORY.length - 1];
  const prev = MOCK_CAPACITY_HISTORY[MOCK_CAPACITY_HISTORY.length - 2];
  return {
    solarGW: latest.solar,
    windGW: latest.wind,
    capacityHistory: [...MOCK_CAPACITY_HISTORY],
    solarYoYChange: ((latest.solar - prev.solar) / prev.solar) * 100,
    windYoYChange: ((latest.wind - prev.wind) / prev.wind) * 100,
    isMock: true,
  };
}

export async function fetchStatePrices(): Promise<Record<string, number>> {
  if (!API_KEY) {
    return MOCK_STATE_PRICES;
  }

  try {
    const stateCodes = Object.keys(MOCK_STATE_PRICES);
    const facets = stateCodes.map((s) => `facets[stateid][]=${s}`).join('&');
    const url = `${EIA_BASE}/electricity/retail-sales/data/?api_key=${API_KEY}&frequency=annual&data[0]=price&${facets}&sort[0][column]=period&sort[0][direction]=desc&length=51`;

    const response = await axios.get<EIAResponse>(url, { timeout: 15000 });
    const data = response.data?.response?.data || [];

    if (data.length === 0) return MOCK_STATE_PRICES;

    const stateMap: Record<string, number[]> = {};
    data.forEach((d) => {
      if (d.stateid && d.price) {
        if (!stateMap[d.stateid]) stateMap[d.stateid] = [];
        stateMap[d.stateid].push(Number(d.price));
      }
    });

    const result: Record<string, number> = { ...MOCK_STATE_PRICES };
    Object.entries(stateMap).forEach(([state, prices]) => {
      result[state] = prices.reduce((a, b) => a + b, 0) / prices.length;
    });

    return result;
  } catch (error) {
    console.warn('[EIA] State prices fetch failed, using mock data:', error);
    return MOCK_STATE_PRICES;
  }
}
