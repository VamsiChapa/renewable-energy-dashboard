import { create } from 'zustand';
import {
  MarketData,
  ProjectInputs,
  ProjectResults,
  SelectedState,
  ChatMessage,
} from '../types';

interface DashboardStore {
  // Market data (set by Tab 1, read by Tab 3)
  marketData: MarketData;
  marketDataLoading: boolean;
  marketDataError: string | null;

  // Project inputs (set by Tab 2, read by Tab 3 and Tab 4)
  projectInputs: ProjectInputs;

  // Project results (set by Tab 2, read by Tab 3)
  projectResults: ProjectResults;

  // Selected state (set by Tab 4, read by Tab 2 and Tab 3)
  selectedState: SelectedState;

  // Cross-tab notification
  notification: string | null;

  // Chat history (Tab 3)
  chatHistory: ChatMessage[];

  // Actions
  setMarketData: (data: Partial<MarketData>) => void;
  setMarketDataLoading: (loading: boolean) => void;
  setMarketDataError: (error: string | null) => void;
  updateProjectInput: <K extends keyof ProjectInputs>(key: K, value: ProjectInputs[K]) => void;
  setProjectInputs: (inputs: ProjectInputs) => void;
  setProjectResults: (results: ProjectResults) => void;
  setSelectedState: (state: SelectedState) => void;
  applyStateElectricityRate: () => void;
  addChatMessage: (msg: Omit<ChatMessage, 'timestamp'>) => void;
  clearChatHistory: () => void;
  setNotification: (msg: string | null) => void;
}

const defaultProjectInputs: ProjectInputs = {
  projectType: 'solar',
  systemSizeMW: 10,
  capacityFactor: 0.22,
  degradationRate: 0.005,
  installationCostPerW: 1.0,
  omCostsPerKWYear: 15,
  electricityRate: 0.065,
  annualRateEscalation: 0.02,
  projectLifeYears: 25,
  debtFinancingPct: 0.70,
  interestRate: 0.06,
  loanTermYears: 18,
  federalITC: 0.30,
  federalPTC: 0.026,
};

const emptyResults: ProjectResults = {
  irr: null,
  npv: null,
  lcoe: null,
  paybackYears: null,
  totalCostM: null,
  annualEnergyMWh: null,
  grossRevenueM: null,
  omCostM: null,
  noiM: null,
  dscr: null,
  cashFlows: [],
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  marketData: {
    avgElectricityPrice: null,
    solarCapacityGW: null,
    windCapacityGW: null,
    treasuryRate: null,
    cpiInflation: null,
    lastUpdated: null,
    priceHistory: [],
    capacityHistory: [],
    priceYoYChange: null,
    solarYoYChange: null,
    windYoYChange: null,
  },
  marketDataLoading: false,
  marketDataError: null,

  projectInputs: defaultProjectInputs,
  projectResults: emptyResults,

  selectedState: {
    name: null,
    code: null,
    avgElectricityPrice: null,
    solarResource: null,
  },

  notification: null,
  chatHistory: [],

  setMarketData: (data) =>
    set((state) => ({
      marketData: { ...state.marketData, ...data },
    })),

  setMarketDataLoading: (loading) => set({ marketDataLoading: loading }),
  setMarketDataError: (error) => set({ marketDataError: error }),

  updateProjectInput: (key, value) =>
    set((state) => ({
      projectInputs: { ...state.projectInputs, [key]: value },
    })),

  setProjectInputs: (inputs) => set({ projectInputs: inputs }),

  setProjectResults: (results) => set({ projectResults: results }),

  setSelectedState: (selectedState) => set({ selectedState }),

  applyStateElectricityRate: () => {
    const { selectedState } = get();
    if (selectedState.avgElectricityPrice !== null) {
      set((state) => ({
        projectInputs: {
          ...state.projectInputs,
          electricityRate: selectedState.avgElectricityPrice! / 100, // convert cents to dollars
        },
        notification: `Electricity rate updated to ${selectedState.avgElectricityPrice!.toFixed(2)} ¢/kWh from ${selectedState.name} data`,
      }));
    }
  },

  addChatMessage: (msg) =>
    set((state) => ({
      chatHistory: [
        ...state.chatHistory,
        { ...msg, timestamp: new Date() },
      ],
    })),

  clearChatHistory: () => set({ chatHistory: [] }),

  setNotification: (notification) => set({ notification }),
}));
