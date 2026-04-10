// Market Data Types
export interface PriceHistoryPoint {
  period: string;
  price: number;
}

export interface CapacityHistoryPoint {
  year: number;
  solar: number;
  wind: number;
}

export interface MarketData {
  avgElectricityPrice: number | null;
  solarCapacityGW: number | null;
  windCapacityGW: number | null;
  treasuryRate: number | null;
  cpiInflation: number | null;
  lastUpdated: Date | null;
  priceHistory: PriceHistoryPoint[];
  capacityHistory: CapacityHistoryPoint[];
  priceYoYChange: number | null;
  solarYoYChange: number | null;
  windYoYChange: number | null;
}

// Project Economics Types
export type ProjectType = 'solar' | 'wind';

export interface ProjectInputs {
  projectType: ProjectType;
  systemSizeMW: number;
  capacityFactor: number;
  degradationRate: number;
  installationCostPerW: number;
  omCostsPerKWYear: number;
  electricityRate: number; // $/kWh
  annualRateEscalation: number;
  projectLifeYears: number;
  debtFinancingPct: number;
  interestRate: number;
  loanTermYears: number;
  federalITC: number; // % for solar
  federalPTC: number; // $/kWh for wind
}

export interface ProjectResults {
  irr: number | null;
  npv: number | null;
  lcoe: number | null;
  paybackYears: number | null;
  totalCostM: number | null;
  annualEnergyMWh: number | null;
  grossRevenueM: number | null;
  omCostM: number | null;
  noiM: number | null;
  dscr: number | null;
  cashFlows: AnnualCashFlow[];
}

export interface AnnualCashFlow {
  year: number;
  revenue: number;
  opex: number;
  debtService: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface ScenarioResults {
  base: ProjectResults;
  optimistic: ProjectResults;
  conservative: ProjectResults;
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// State/Geographic Types
export interface StateData {
  name: string;
  code: string;
  avgElectricityPrice: number | null; // $/kWh
  solarResource: number | null; // kWh/m2/day
  lat: number;
  lng: number;
}

export interface SelectedState {
  name: string | null;
  code: string | null;
  avgElectricityPrice: number | null;
  solarResource: number | null;
}

// API Response Types
export interface EIAResponse {
  response: {
    data: EIADataPoint[];
    total: number;
  };
}

export interface EIADataPoint {
  period: string;
  price?: number;
  'nameplate-capacity-mw'?: number;
  fueltypeid?: string;
  stateid?: string;
  sectorName?: string;
}

export interface FREDResponse {
  observations: FREDObservation[];
}

export interface FREDObservation {
  date: string;
  value: string;
}

export interface NRELPVWattsResponse {
  outputs: {
    ac_annual: number;
    solrad_annual: number;
    capacity_factor: number;
  };
}

// City solar data for map markers
export interface CitySolarData {
  name: string;
  lat: number;
  lng: number;
  solarResource: number; // kWh/m2/day
  state: string;
}
