# US Renewable Energy Investment Analysis Dashboard

**Live URL:** https://renewable-energy-dashboard-zeta.vercel.app

A production-ready multi-tab web application for analyzing US renewable energy investment opportunities. Combines real-time market data from government APIs with an AI-powered research assistant and interactive geographic visualization.

---

## Architecture Overview

```
React 18 + TypeScript + Vite
├── Tab 1: Market Overview      — EIA & FRED real-time data, charts
├── Tab 2: Project Economics    — Client-side IRR/NPV/LCOE calculator
├── Tab 3: Research Assistant   — Claude AI with market context injection
└── Tab 4: Geographic           — Leaflet choropleth + NREL solar resource

Global State: Zustand (cross-tab data flow)
Charts: Recharts
Maps: react-leaflet + OpenStreetMap
AI: @anthropic-ai/sdk (streaming)
```

### Cross-Tab Data Flow

- **Tab 1 → Tab 3**: Live electricity prices, solar/wind capacity, and macroeconomic rates are injected into the Claude system prompt automatically.
- **Tab 2 → Tab 3**: Your current project scenario (size, type, IRR, NPV) feeds into AI analysis context.
- **Tab 4 → Tab 2**: Clicking a state and pressing "Use Rate in Calculator" updates the electricity selling rate in the financial model.
- **Tab 4 → Tab 3**: The selected state's context (resource, price) is included in AI prompts.

---

## API Integrations

| API | Provider | Usage | Docs |
|---|---|---|---|
| EIA Open Data v2 | US Energy Information Administration | Retail electricity prices, solar/wind installed capacity | https://api.eia.gov |
| FRED | Federal Reserve Bank of St. Louis | 10-Year Treasury rate, CPI inflation | https://fred.stlouisfed.org/docs/api |
| NREL PVWatts v6 | National Renewable Energy Laboratory | Solar irradiance by lat/lon | https://developer.nrel.gov/docs/solar/pvwatts |
| Claude API | Anthropic | AI research assistant with streaming | https://docs.anthropic.com |

All integrations include mock data fallbacks. The app is fully functional without any API keys — mock data is clearly labeled with a "Sample Data" badge.

---

## Financial Calculations

All calculations are client-side in `src/utils/financialCalculations.ts`:

**IRR** — Bisection method, 1000 iterations, 1e-7 tolerance. Verified: `[-100, 30, 30, 30, 30]` → ~7.71%

**NPV** — Standard DCF at 8% discount rate:
`NPV = Σ(CF_t / (1 + r)^t)`

**LCOE** — Discounted lifetime costs over discounted lifetime energy:
`LCOE = (CAPEX + Σ OPEX_t/(1+r)^t) / Σ (Energy_t/(1+r)^t)`

**Cash Flow Model** — 25-year annual model including:
- Energy degradation (0.5%/yr default)
- Revenue escalation (PPA escalator)
- Debt service (level payments, annuity formula)
- Federal ITC (solar, year 0) or PTC (wind, years 1-10)
- O&M escalation at 2%/yr

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

```bash
# Clone and install
git clone <repo-url>
cd renewable-energy-dashboard
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys (optional — app works without them)

# Start dev server
npm run dev
```

Open http://localhost:5173

### Production Build

```bash
npm run build
npm run preview
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or via CLI:
vercel env add VITE_EIA_API_KEY
vercel env add VITE_NREL_API_KEY
vercel env add VITE_FRED_API_KEY
vercel env add VITE_ANTHROPIC_API_KEY
```

---

## Environment Variables

| Variable | Required | Description | Get Key |
|---|---|---|---|
| `VITE_EIA_API_KEY` | Optional | EIA Open Data API key | https://www.eia.gov/opendata/register.php |
| `VITE_NREL_API_KEY` | Optional | NREL Developer API key (DEMO_KEY works for low-volume) | https://developer.nrel.gov/signup/ |
| `VITE_FRED_API_KEY` | Optional | FRED API key | https://fred.stlouisfed.org/docs/api/api_key.html |
| `VITE_ANTHROPIC_API_KEY` | Optional | Anthropic Claude API key | https://console.anthropic.com |

All variables are optional — the dashboard loads with mock/sample data when keys are absent.

> **Security note**: This application makes API calls from the browser (frontend). This is acceptable for demo and internal tooling contexts. For production customer-facing deployments, proxy sensitive API calls through a backend service.

---

## Project Structure

```
src/
├── components/
│   ├── ui/           — shadcn/ui primitives (Card, Button, Input, etc.)
│   ├── tabs/         — Four main tab components
│   └── shared/       — Reusable (LoadingSpinner, DataProvenance)
├── services/
│   ├── eia.ts        — EIA API client + mock data
│   ├── fred.ts       — FRED API client + mock data
│   ├── nrel.ts       — NREL API + static solar resource tables
│   └── claude.ts     — Anthropic streaming + demo mode fallback
├── store/
│   └── dashboardStore.ts  — Zustand global state
├── utils/
│   └── financialCalculations.ts  — IRR/NPV/LCOE/cash flow engine
└── types/
    └── index.ts      — All shared TypeScript types
```

---

## AI Tool Usage Disclosure

This project was built with AI coding assistance (Claude Code). The following components were generated with AI assistance and reviewed for correctness:

- Financial calculation algorithms (IRR bisection, NPV, LCOE)
- React component structure and TypeScript types
- Zustand store design
- API service layer with mock fallbacks
- CSS and Tailwind styling

All financial calculations have been verified against known test cases. The IRR implementation produces correct results against standard financial benchmarks.
