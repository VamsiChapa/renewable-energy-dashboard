import axios from 'axios';
import { CitySolarData } from '../types';

const NREL_BASE = 'https://developer.nrel.gov/api/pvwatts/v6.json';
const API_KEY = import.meta.env.VITE_NREL_API_KEY || 'DEMO_KEY';

// Static solar resource data for major US cities (kWh/m2/day)
// These are well-documented values that don't require API calls
export const CITY_SOLAR_DATA: CitySolarData[] = [
  { name: 'Phoenix, AZ', lat: 33.45, lng: -112.07, solarResource: 6.57, state: 'AZ' },
  { name: 'Las Vegas, NV', lat: 36.17, lng: -115.14, solarResource: 6.41, state: 'NV' },
  { name: 'Los Angeles, CA', lat: 34.05, lng: -118.24, solarResource: 5.62, state: 'CA' },
  { name: 'Dallas, TX', lat: 32.78, lng: -96.80, solarResource: 5.28, state: 'TX' },
  { name: 'Denver, CO', lat: 39.74, lng: -104.98, solarResource: 5.46, state: 'CO' },
  { name: 'Miami, FL', lat: 25.77, lng: -80.19, solarResource: 5.26, state: 'FL' },
  { name: 'Atlanta, GA', lat: 33.75, lng: -84.39, solarResource: 4.92, state: 'GA' },
  { name: 'Chicago, IL', lat: 41.85, lng: -87.65, solarResource: 4.08, state: 'IL' },
  { name: 'New York, NY', lat: 40.71, lng: -74.01, solarResource: 4.14, state: 'NY' },
  { name: 'Boston, MA', lat: 42.36, lng: -71.06, solarResource: 4.07, state: 'MA' },
  { name: 'Seattle, WA', lat: 47.61, lng: -122.33, solarResource: 3.56, state: 'WA' },
  { name: 'Minneapolis, MN', lat: 44.98, lng: -93.27, solarResource: 4.34, state: 'MN' },
  { name: 'Albuquerque, NM', lat: 35.08, lng: -106.65, solarResource: 6.44, state: 'NM' },
  { name: 'Nashville, TN', lat: 36.17, lng: -86.78, solarResource: 4.81, state: 'TN' },
  { name: 'Houston, TX', lat: 29.76, lng: -95.37, solarResource: 4.92, state: 'TX' },
];

// State capital lat/lng for NREL lookups
export const STATE_COORDS: Record<string, { lat: number; lng: number }> = {
  AL: { lat: 32.36, lng: -86.30 }, AK: { lat: 58.30, lng: -134.42 },
  AZ: { lat: 33.45, lng: -112.07 }, AR: { lat: 34.74, lng: -92.33 },
  CA: { lat: 38.55, lng: -121.47 }, CO: { lat: 39.74, lng: -104.98 },
  CT: { lat: 41.77, lng: -72.68 }, DE: { lat: 39.16, lng: -75.53 },
  FL: { lat: 30.43, lng: -84.27 }, GA: { lat: 33.76, lng: -84.39 },
  HI: { lat: 21.31, lng: -157.83 }, ID: { lat: 43.60, lng: -116.20 },
  IL: { lat: 39.80, lng: -89.65 }, IN: { lat: 39.77, lng: -86.16 },
  IA: { lat: 41.59, lng: -93.62 }, KS: { lat: 39.04, lng: -95.69 },
  KY: { lat: 38.20, lng: -84.86 }, LA: { lat: 30.45, lng: -91.18 },
  ME: { lat: 44.32, lng: -69.77 }, MD: { lat: 38.97, lng: -76.50 },
  MA: { lat: 42.36, lng: -71.06 }, MI: { lat: 42.73, lng: -84.55 },
  MN: { lat: 44.95, lng: -93.10 }, MS: { lat: 32.32, lng: -90.21 },
  MO: { lat: 38.57, lng: -92.19 }, MT: { lat: 46.60, lng: -112.02 },
  NE: { lat: 40.81, lng: -96.68 }, NV: { lat: 39.16, lng: -119.77 },
  NH: { lat: 43.22, lng: -71.55 }, NJ: { lat: 40.22, lng: -74.77 },
  NM: { lat: 35.08, lng: -106.65 }, NY: { lat: 42.66, lng: -73.79 },
  NC: { lat: 35.77, lng: -78.64 }, ND: { lat: 46.82, lng: -100.78 },
  OH: { lat: 39.96, lng: -83.00 }, OK: { lat: 35.48, lng: -97.53 },
  OR: { lat: 44.93, lng: -123.04 }, PA: { lat: 40.27, lng: -76.88 },
  RI: { lat: 41.82, lng: -71.42 }, SC: { lat: 34.00, lng: -81.04 },
  SD: { lat: 44.37, lng: -100.35 }, TN: { lat: 36.17, lng: -86.78 },
  TX: { lat: 30.27, lng: -97.74 }, UT: { lat: 40.78, lng: -111.93 },
  VT: { lat: 44.26, lng: -72.58 }, VA: { lat: 37.54, lng: -77.44 },
  WA: { lat: 47.04, lng: -122.90 }, WV: { lat: 38.35, lng: -81.63 },
  WI: { lat: 43.07, lng: -89.39 }, WY: { lat: 41.13, lng: -104.82 },
};

// Static solar resource by state (kWh/m2/day) - used as fallback
export const STATE_SOLAR_RESOURCE: Record<string, number> = {
  AL: 4.69, AK: 3.14, AZ: 6.57, AR: 4.69, CA: 5.62, CO: 5.46, CT: 4.07,
  DE: 4.14, FL: 5.26, GA: 4.92, HI: 5.59, ID: 4.92, IL: 4.08, IN: 4.21,
  IA: 4.34, KS: 5.05, KY: 4.34, LA: 5.12, ME: 3.99, MD: 4.14, MA: 4.07,
  MI: 3.99, MN: 4.34, MS: 5.12, MO: 4.69, MT: 4.92, NE: 4.92, NV: 6.41,
  NH: 3.99, NJ: 4.07, NM: 6.44, NY: 4.14, NC: 4.69, ND: 4.69, OH: 3.92,
  OK: 5.28, OR: 4.20, PA: 4.07, RI: 4.07, SC: 4.92, SD: 4.69, TN: 4.81,
  TX: 5.28, UT: 5.46, VT: 3.92, VA: 4.14, WA: 3.56, WV: 3.92, WI: 3.99,
  WY: 5.46,
};

export async function fetchSolarResource(lat: number, lng: number): Promise<number> {
  try {
    const response = await axios.get(NREL_BASE, {
      params: {
        api_key: API_KEY,
        lat,
        lon: lng,
        system_capacity: 1,
        azimuth: 180,
        tilt: 20,
        array_type: 1,
        module_type: 0,
        losses: 14,
      },
      timeout: 10000,
    });

    const solrad = response.data?.outputs?.solrad_annual;
    return solrad ?? 5.0;
  } catch (error) {
    console.warn('[NREL] Solar resource fetch failed:', error);
    return 5.0;
  }
}
