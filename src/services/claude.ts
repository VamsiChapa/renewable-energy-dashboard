import Anthropic from '@anthropic-ai/sdk';
import { MarketData, ProjectInputs, ProjectResults, SelectedState } from '../types';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

// Initialize client - browser-side for demo/hackathon context
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }
  return client;
}

export function buildSystemPrompt(
  marketData: MarketData,
  projectInputs: ProjectInputs,
  projectResults: ProjectResults,
  selectedState: SelectedState
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const projectDetails = `
Project Type: ${projectInputs.projectType.toUpperCase()}
System Size: ${projectInputs.systemSizeMW} MW
Capacity Factor: ${(projectInputs.capacityFactor * 100).toFixed(1)}%
Installation Cost: $${projectInputs.installationCostPerW.toFixed(2)}/W
Electricity Rate: ${(projectInputs.electricityRate * 100).toFixed(2)} ¢/kWh
Project Life: ${projectInputs.projectLifeYears} years
Debt Financing: ${(projectInputs.debtFinancingPct * 100).toFixed(0)}%
Interest Rate: ${(projectInputs.interestRate * 100).toFixed(1)}%
${projectInputs.projectType === 'solar' ? `Federal ITC: ${(projectInputs.federalITC * 100).toFixed(0)}%` : `Federal PTC: $${projectInputs.federalPTC}/kWh`}

Calculated Results:
${projectResults.irr !== null ? `- IRR: ${projectResults.irr.toFixed(2)}%` : '- IRR: Not yet calculated'}
${projectResults.npv !== null ? `- NPV (8% discount): $${projectResults.npv?.toFixed(2)}M` : '- NPV: Not yet calculated'}
${projectResults.lcoe !== null ? `- LCOE: $${projectResults.lcoe?.toFixed(2)}/MWh` : '- LCOE: Not yet calculated'}
${projectResults.totalCostM !== null ? `- Total Project Cost: $${projectResults.totalCostM?.toFixed(2)}M` : ''}
${projectResults.dscr !== null ? `- DSCR: ${projectResults.dscr?.toFixed(2)}x` : ''}`.trim();

  const stateInfo = selectedState.name
    ? `Selected State: ${selectedState.name} (${selectedState.code})
Avg Electricity Price: ${selectedState.avgElectricityPrice?.toFixed(2) ?? 'N/A'} ¢/kWh
Solar Resource: ${selectedState.solarResource?.toFixed(2) ?? 'N/A'} kWh/m²/day`
    : 'No specific state selected. Analysis is national in scope.';

  const marketSection = marketData.avgElectricityPrice
    ? `- National avg retail electricity price: ${marketData.avgElectricityPrice.toFixed(2)} cents/kWh (EIA, ${dateStr})
- Total installed solar capacity: ${marketData.solarCapacityGW?.toFixed(1) ?? 'N/A'} GW (EIA)
- Total installed wind capacity: ${marketData.windCapacityGW?.toFixed(1) ?? 'N/A'} GW (EIA)
- 10-Year Treasury Rate: ${marketData.treasuryRate?.toFixed(2) ?? 'N/A'}% (FRED)
- CPI Inflation (YoY): ${marketData.cpiInflation?.toFixed(2) ?? 'N/A'}% (FRED)`
    : '- Market data not yet loaded. Use training knowledge with appropriate uncertainty flags.';

  return `You are a renewable energy investment analyst assistant with access to current market data.
You help investment analysts evaluate solar and wind energy opportunities in the United States.

CURRENT MARKET DATA (from EIA & FRED APIs, pulled at session start):
${marketSection}

USER'S CURRENT PROJECT SCENARIO:
${projectDetails}

SELECTED STATE/REGION:
${stateInfo}

INSTRUCTIONS:
- Always cite your data sources (EIA, FRED, NREL, or your training knowledge).
- Distinguish between real-time API data shown above versus your training knowledge.
- Flag when information may be outdated or when you're uncertain.
- Be specific with numbers. Think like a senior renewable energy investment analyst.
- When discussing financials, reference the user's actual project parameters above.
- IRA (Inflation Reduction Act) tax incentives are highly relevant context for US renewable projects.
- Provide actionable insights, not just summaries.
- Use structured responses with clear headers when appropriate.`;
}

export async function sendMessage(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  if (!API_KEY) {
    // Simulate a response for demo mode
    const demoResponse = generateDemoResponse(userMessage);
    let i = 0;
    const interval = setInterval(() => {
      if (i < demoResponse.length) {
        onChunk(demoResponse.slice(i, i + 3));
        i += 3;
      } else {
        clearInterval(interval);
        onDone();
      }
    }, 15);
    return;
  }

  try {
    const anthropic = getClient();

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onChunk(event.delta.text);
      }
    }

    onDone();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    onError(`Claude API error: ${msg}`);
  }
}

function generateDemoResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('irr') || lower.includes('return')) {
    return `## IRR Analysis

Based on your current project configuration, here's what drives IRR for utility-scale solar in the US:

**Key IRR drivers:**
1. **Electricity rate** — Your modeled rate of 6.5 ¢/kWh is on the lower end. Markets like California (22.1 ¢/kWh) or New England (18-25 ¢/kWh) would dramatically improve returns
2. **Capacity factor** — Your 22% assumption is conservative. Southwest US sites routinely achieve 25-28%
3. **ITC leverage** — The 30% Federal ITC (IRA 2022) effectively reduces your equity basis by 30%, which is the single largest returns driver for solar

**Benchmark context** (from industry knowledge, not live API):
- Utility-scale solar IRRs: 7-14% unlevered, 12-20% levered depending on market
- IRA adders (domestic content, energy communities) can add 10+ percentage points to ITC

**My recommendation:** Run the Optimistic scenario to see the upside case. The sensitivity to electricity rate is the #1 variable worth stress-testing.

*Note: This analysis uses your project parameters + my training knowledge. Real-time market data is displayed in the Market Overview tab.*`;
  }

  if (lower.includes('lcoe') || lower.includes('levelized')) {
    return `## LCOE Benchmarking

**What your LCOE means:**

LCOE (Levelized Cost of Energy) is the break-even electricity price at which your project recovers all costs over its lifetime.

**Current US benchmarks** (Lazard LCOE Analysis, approximate):
- Utility-scale solar: $24-96/MWh (wide range due to location, financing)
- Wind onshore: $24-75/MWh
- Combined cycle gas: $39-101/MWh

**How to read your number:**
- If your LCOE < your electricity selling rate → project is economically viable
- The spread between LCOE and PPA rate is your margin buffer

**IRA impact:** The 30% ITC reduces effective LCOE by roughly 20-25% for solar, making many projects that were marginal now bankable.

*Source: Training knowledge + Lazard 2023 LCOE report. EIA current electricity prices shown in Market Overview tab.*`;
  }

  if (lower.includes('wind') || lower.includes('solar') || lower.includes('project')) {
    return `## Solar vs. Wind Investment Comparison

Here's how to think about the solar vs. wind choice for a US utility-scale project:

**Solar advantages:**
- Lower installation cost ($0.80-1.20/W utility-scale)
- 30% ITC (or up to 50% with IRA adders: domestic content + energy communities + low-income)
- Faster permitting, more predictable interconnection
- Modular — easier to phase and expand

**Wind advantages:**
- Higher capacity factors (35-45% onshore) vs solar (20-28%)
- Production Tax Credit (PTC) at ~$2.77/kWh for 10 years provides long-term revenue support
- Better for markets with strong nighttime load or grid needs
- Lower LCOE in high-wind resource areas (Great Plains, Texas)

**Current market dynamics:**
- Solar has seen 3-4x capacity growth in 5 years; interconnection queues are congested
- Wind development is slowing in some regions due to local opposition and supply chain constraints
- Both benefit significantly from IRA provisions through at least 2032

**My take for your project:** At 10 MW, you're in the right size range for both. The primary decision driver should be site resource (where is the project located?) followed by offtake rate availability.

*Analysis based on training knowledge + your project parameters in the calculator.*`;
  }

  return `## Renewable Energy Investment Analysis

Thank you for your question. As your AI research assistant, I have access to your current project scenario and live market data from EIA and FRED.

**What I can help you analyze:**
- IRR/NPV sensitivity to key assumptions (electricity rate, capacity factor, capex)
- IRA (Inflation Reduction Act) tax incentive strategy and stacking
- Market comparison across US states and regions
- Financing structure optimization (tax equity, debt sizing)
- Risk factors: curtailment, basis risk, merchant exposure
- Offtake strategy: PPA vs. merchant vs. hedge structures

**Context from your current setup:**
Your project inputs are loaded in the calculator (Tab 2) and feed into my analysis here. Select a state in the Geographic Visualization tab (Tab 4) to add regional context.

What specific aspect would you like to dig into? Try asking about:
- "What IRR can I expect for a 50 MW solar project in Texas?"
- "How does the domestic content ITC adder work?"
- "Compare my project economics to industry benchmarks"`;
}
