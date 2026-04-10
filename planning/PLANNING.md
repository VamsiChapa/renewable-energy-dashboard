# Planning: US Renewable Energy Investment Analysis Dashboard

## Tech Stack Choices & Rationale

| Technology | Choice | Rationale |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | Vite for fast HMR during development; React 18 for concurrent rendering; TypeScript for type safety across financial calculations |
| Styling | Tailwind CSS v3 + shadcn/ui | shadcn/ui is unstyled primitives on Radix — full control over dark theme without fighting component defaults |
| Charts | Recharts | First-class React integration, easy customization, declarative API |
| Maps | Leaflet + react-leaflet | Most mature open-source map library; OpenStreetMap tiles are free and require no API key |
| State | Zustand | Minimal boilerplate for global state; cross-tab data flow is the core requirement; Zustand's flat store pattern fits perfectly |
| HTTP | Axios | Consistent error handling, timeout support, cleaner than raw fetch for API calls with query params |
| AI | @anthropic-ai/sdk | Direct integration with Claude streaming API; browser-side for demo/hackathon context |

## Phase Breakdown

### Phase 1: Foundation (Config + Types + Store)
- [x] package.json, vite.config.ts, tsconfig.json
- [x] tailwind.config.js, postcss.config.js
- [x] src/types/index.ts — all shared types
- [x] src/store/dashboardStore.ts — Zustand global state with all cross-tab actions

### Phase 2: Service Layer (API + Mock Fallbacks)
- [x] src/services/eia.ts — EIA price and capacity fetching with mock fallback
- [x] src/services/fred.ts — FRED treasury rate and CPI fetching
- [x] src/services/nrel.ts — NREL PVWatts + static city solar data
- [x] src/services/claude.ts — Anthropic streaming API + demo mode fallback

### Phase 3: Financial Engine
- [x] src/utils/financialCalculations.ts
  - calculateNPV (standard DCF)
  - calculateIRR (bisection method, verified: [-100,30,30,30,30] → ~7.7%)
  - calculateLCOE (discounted cost / discounted energy)
  - generateCashFlows (full 25-year model)
  - calculateProjectResults (aggregates all outputs)
  - applyScenario (multipliers for optimistic/conservative)

### Phase 4: UI Components
- [x] shadcn/ui primitives (Card, Button, Input, Select, Badge, etc.)
- [x] Shared components (LoadingSpinner, DataProvenance)

### Phase 5: Tab Implementation
- [x] Tab 1: MarketOverview — EIA + FRED data, two charts, KPI cards
- [x] Tab 2: ProjectEconomics — Full IRR/NPV/LCOE calculator, scenario comparison
- [x] Tab 3: ResearchAssistant — Claude streaming chat with context injection
- [x] Tab 4: GeographicVisualization — Leaflet choropleth + solar markers

### Phase 6: Integration + Polish
- [x] Cross-tab state flow via Zustand
- [x] Toast notifications for state rate updates
- [x] Dark theme (slate-900 background, emerald-500 accent)
- [x] Loading states and error handling throughout

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   React App (Vite)                   │
│                                                     │
│  ┌─────────┐ ┌────────────┐ ┌──────────┐ ┌──────┐  │
│  │  Tab 1  │ │   Tab 2    │ │  Tab 3   │ │Tab 4 │  │
│  │ Market  │ │ Economics  │ │ Research │ │ Map  │  │
│  │Overview │ │ Calculator │ │Assistant │ │      │  │
│  └────┬────┘ └─────┬──────┘ └────┬─────┘ └──┬───┘  │
│       │            │             │           │      │
│  ┌────▼────────────▼─────────────▼───────────▼───┐  │
│  │              Zustand Global Store              │  │
│  │  marketData │ projectInputs │ selectedState   │  │
│  │  projectResults │ chatHistory │ notification  │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────┐  │
│  │  eia.ts   │ │  fred.ts  │ │ nrel.ts  │ │claude│  │
│  │EIA API    │ │ FRED API  │ │NREL API  │ │  AI  │  │
│  │+ mocks    │ │ + mocks   │ │+ statics │ │      │  │
│  └───────────┘ └───────────┘ └──────────┘ └──────┘  │
└─────────────────────────────────────────────────────┘

Cross-Tab Data Flow:
  Tab 1 → Store.marketData → Tab 3 system prompt
  Tab 2 → Store.projectInputs/Results → Tab 3 system prompt
  Tab 4 → Store.selectedState → Tab 2 electricity rate + Tab 3 context
  Tab 4 "Use Rate" button → Store.applyStateElectricityRate() → Tab 2 input update + toast
```

## Prioritization Decisions

1. **Financial calculations first** — IRR/NPV/LCOE accuracy is non-negotiable. A beautiful map with wrong math fails the core use case.

2. **Mock data fallbacks required** — Without API keys the app must fully function. Degraded-but-labeled is acceptable; broken is not.

3. **Cross-tab flow is the differentiator** — The requirement for state rate to flow into calculator, and market data into AI context, is what makes this a dashboard vs. four separate tools.

4. **Dark theme is mandatory** — Professional finance tools live in dark mode. Light mode was never considered.

## What Gets Cut If Time Is Short

If scope needs trimming, in order of priority to cut:

1. Real NREL API calls per state (replaced by static lookup table — already implemented)
2. FRED CPI series (treasury rate is more important for discount rate context)
3. Scenario comparison table (base case IRR/NPV is the critical path)
4. Streaming AI responses (could batch with a simpler call)
5. GeoJSON choropleth (could show a simple data table of state prices instead)

## Known Constraints & Mitigations

| Constraint | Mitigation |
|---|---|
| Anthropic API from browser | Acceptable for demo/hackathon; dangerouslyAllowBrowser: true documented |
| EIA API CORS | EIA v2 API supports CORS for browser requests |
| Leaflet SSR | Using react-leaflet with dynamic imports if SSR is ever needed |
| GeoJSON file size | Loading from CDN (PublicaMundi); ~1MB, acceptable for demo |
| IRR convergence | Bisection method with 1000 iterations and ±0.1% tolerance; handles edge cases |
