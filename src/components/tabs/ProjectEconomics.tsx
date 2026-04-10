import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Calculator, TrendingUp, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboardStore } from '@/store/dashboardStore';
import { calculateProjectResults, applyScenario } from '@/utils/financialCalculations';
import { ProjectInputs, ProjectResults } from '@/types';

export function ProjectEconomics() {
  const { projectInputs, projectResults, updateProjectInput, setProjectResults, selectedState, marketData } = useDashboardStore();
  const [scenarios, setScenarios] = useState<{
    base: ProjectResults;
    optimistic: ProjectResults;
    conservative: ProjectResults;
  } | null>(null);

  // Recalculate on every input change
  useEffect(() => {
    const base = calculateProjectResults(projectInputs);
    const optimistic = calculateProjectResults(applyScenario(projectInputs, 'optimistic'));
    const conservative = calculateProjectResults(applyScenario(projectInputs, 'conservative'));

    setProjectResults(base);
    setScenarios({ base, optimistic, conservative });
  }, [projectInputs, setProjectResults]);

  // When project type changes, update defaults
  const handleProjectTypeChange = (type: 'solar' | 'wind') => {
    updateProjectInput('projectType', type);
    if (type === 'solar') {
      updateProjectInput('capacityFactor', 0.22);
      updateProjectInput('installationCostPerW', 1.0);
      updateProjectInput('omCostsPerKWYear', 15);
    } else {
      updateProjectInput('capacityFactor', 0.35);
      updateProjectInput('installationCostPerW', 1.3);
      updateProjectInput('omCostsPerKWYear', 40);
    }
  };

  const stateRateAvailable = selectedState.avgElectricityPrice !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-emerald-400" />
            Project Economics Calculator
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            IRR / NPV / LCOE — recalculates instantly on every input change
          </p>
        </div>
        {stateRateAvailable && (
          <Badge className="bg-emerald-900/40 text-emerald-300 border-emerald-700">
            Using {selectedState.name} rate: {selectedState.avgElectricityPrice?.toFixed(2)} ¢/kWh
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium">Project Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Project Type */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Project Type</Label>
                <Select
                  value={projectInputs.projectType}
                  onValueChange={(v) => handleProjectTypeChange(v as 'solar' | 'wind')}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-600">
                    <SelectItem value="solar" className="text-white">Solar PV</SelectItem>
                    <SelectItem value="wind" className="text-white">Onshore Wind</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <NumberInput
                label="System Size (MW)"
                value={projectInputs.systemSizeMW}
                onChange={(v) => updateProjectInput('systemSizeMW', v)}
                min={0.1}
                step={1}
                tooltip="Nameplate AC capacity of the project in megawatts"
              />
              <NumberInput
                label="Capacity Factor (%)"
                value={projectInputs.capacityFactor * 100}
                onChange={(v) => updateProjectInput('capacityFactor', v / 100)}
                min={5}
                max={60}
                step={0.5}
                tooltip="Expected annual generation divided by theoretical maximum. Solar: 18-30%, Wind: 30-45%"
              />
              <NumberInput
                label="Degradation Rate (%/yr)"
                value={projectInputs.degradationRate * 100}
                onChange={(v) => updateProjectInput('degradationRate', v / 100)}
                min={0}
                max={2}
                step={0.1}
                tooltip="Annual performance degradation. Typical solar: 0.5%/yr"
              />

              <Separator className="bg-slate-700" />

              <NumberInput
                label="Install Cost ($/W)"
                value={projectInputs.installationCostPerW}
                onChange={(v) => updateProjectInput('installationCostPerW', v)}
                min={0.1}
                step={0.05}
                tooltip="All-in EPC cost per watt of nameplate capacity"
              />
              <NumberInput
                label="O&M Cost ($/kW-yr)"
                value={projectInputs.omCostsPerKWYear}
                onChange={(v) => updateProjectInput('omCostsPerKWYear', v)}
                min={0}
                step={1}
                tooltip="Annual operations & maintenance cost per kW"
              />

              <Separator className="bg-slate-700" />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-xs">Electricity Rate ($/kWh)</Label>
                  {stateRateAvailable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-xs text-emerald-400 hover:text-emerald-300 p-0"
                      onClick={() => updateProjectInput('electricityRate', (selectedState.avgElectricityPrice ?? 12.5) / 100)}
                    >
                      Use {selectedState.code} rate
                    </Button>
                  )}
                  {marketData.avgElectricityPrice && !stateRateAvailable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-xs text-emerald-400 hover:text-emerald-300 p-0"
                      onClick={() => updateProjectInput('electricityRate', (marketData.avgElectricityPrice ?? 12.5) / 100)}
                    >
                      Use EIA avg
                    </Button>
                  )}
                </div>
                <Input
                  type="number"
                  value={projectInputs.electricityRate}
                  onChange={(e) => updateProjectInput('electricityRate', parseFloat(e.target.value) || 0)}
                  step={0.001}
                  className="bg-slate-900 border-slate-600 text-white h-9 text-sm"
                />
              </div>

              <NumberInput
                label="Rate Escalation (%/yr)"
                value={projectInputs.annualRateEscalation * 100}
                onChange={(v) => updateProjectInput('annualRateEscalation', v / 100)}
                min={0}
                max={5}
                step={0.1}
                tooltip="Annual escalation in electricity selling rate (PPA escalator)"
              />
              <NumberInput
                label="Project Life (years)"
                value={projectInputs.projectLifeYears}
                onChange={(v) => updateProjectInput('projectLifeYears', Math.round(v))}
                min={10}
                max={40}
                step={1}
              />
            </CardContent>
          </Card>

          {/* Financing */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium">Financing Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <NumberInput
                label="Debt Financing (%)"
                value={projectInputs.debtFinancingPct * 100}
                onChange={(v) => updateProjectInput('debtFinancingPct', v / 100)}
                min={0}
                max={90}
                step={5}
                tooltip="Percentage of total project cost financed with debt"
              />
              <NumberInput
                label="Interest Rate (%)"
                value={projectInputs.interestRate * 100}
                onChange={(v) => updateProjectInput('interestRate', v / 100)}
                min={1}
                max={15}
                step={0.25}
              />
              <NumberInput
                label="Loan Term (years)"
                value={projectInputs.loanTermYears}
                onChange={(v) => updateProjectInput('loanTermYears', Math.round(v))}
                min={5}
                max={30}
                step={1}
              />
              <Separator className="bg-slate-700" />
              {projectInputs.projectType === 'solar' ? (
                <NumberInput
                  label="Federal ITC (%)"
                  value={projectInputs.federalITC * 100}
                  onChange={(v) => updateProjectInput('federalITC', v / 100)}
                  min={0}
                  max={50}
                  step={1}
                  tooltip="Investment Tax Credit. Base 30% under IRA; up to 50% with adders"
                />
              ) : (
                <NumberInput
                  label="PTC ($/kWh, 10yr)"
                  value={projectInputs.federalPTC}
                  onChange={(v) => updateProjectInput('federalPTC', v)}
                  min={0}
                  max={0.1}
                  step={0.001}
                  tooltip="Production Tax Credit per kWh generated, applied for first 10 years"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-2 space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ResultCard label="Total Project Cost" value={projectResults.totalCostM} unit="$M" decimals={2} highlight />
            <ResultCard label="Annual Energy (Yr 1)" value={projectResults.annualEnergyMWh} unit="MWh" decimals={0} />
            <ResultCard label="Gross Revenue (Yr 1)" value={projectResults.grossRevenueM} unit="$M" decimals={2} />
            <ResultCard label="IRR (After-Tax)" value={projectResults.irr} unit="%" decimals={2} highlight color={projectResults.irr !== null && projectResults.irr > 8 ? 'emerald' : 'amber'} />
            <ResultCard label="NPV at 8%" value={projectResults.npv} unit="$M" decimals={2} color={projectResults.npv !== null && projectResults.npv > 0 ? 'emerald' : 'red'} />
            <ResultCard label="LCOE" value={projectResults.lcoe} unit="$/MWh" decimals={2} />
            <ResultCard label="Simple Payback" value={projectResults.paybackYears} unit="yrs" decimals={1} />
            <ResultCard label="Net Op. Income (Yr 1)" value={projectResults.noiM} unit="$M" decimals={2} />
            <ResultCard label="DSCR (Yr 1)" value={projectResults.dscr !== null ? Math.min(projectResults.dscr, 99.9) : null} unit="x" decimals={2} color={projectResults.dscr !== null && projectResults.dscr > 1.25 ? 'emerald' : 'amber'} />
          </div>

          {/* Cash Flow Charts */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium">25-Year Cumulative Cash Flow</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Cumulative net cash flow from equity perspective ($M)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projectResults.cashFlows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}M`, 'Cumulative CF']}
                  />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="cumulativeCashFlow" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium">Annual Cash Flow Breakdown</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Revenue, O&M, debt service, and net ($M)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projectResults.cashFlows.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { revenue: 'Revenue', opex: 'O&M', debtService: 'Debt Service', netCashFlow: 'Net CF' };
                      return [`$${value.toFixed(2)}M`, labels[name] || name];
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }} />
                  <Bar dataKey="revenue" fill="#10b981" stackId="a" name="Revenue" />
                  <Bar dataKey="opex" fill="#ef4444" stackId="b" name="O&M" />
                  <Bar dataKey="debtService" fill="#f59e0b" stackId="b" name="Debt Svc" />
                  <Bar dataKey="netCashFlow" fill="#3b82f6" name="Net CF" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Scenario Comparison */}
          {scenarios && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Scenario Comparison
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Optimistic: +20% revenue, -10% costs. Conservative: -20% revenue, +10% costs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-400 text-xs font-medium py-2 pr-4">Metric</th>
                        <th className="text-right text-amber-400 text-xs font-medium py-2 px-3">Conservative</th>
                        <th className="text-right text-slate-200 text-xs font-medium py-2 px-3">Base Case</th>
                        <th className="text-right text-emerald-400 text-xs font-medium py-2 px-3">Optimistic</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      <ScenarioRow label="IRR" conservative={scenarios.conservative.irr} base={scenarios.base.irr} optimistic={scenarios.optimistic.irr} unit="%" />
                      <ScenarioRow label="NPV (8%)" conservative={scenarios.conservative.npv} base={scenarios.base.npv} optimistic={scenarios.optimistic.npv} unit="$M" />
                      <ScenarioRow label="LCOE" conservative={scenarios.conservative.lcoe} base={scenarios.base.lcoe} optimistic={scenarios.optimistic.lcoe} unit="$/MWh" />
                      <ScenarioRow label="Payback" conservative={scenarios.conservative.paybackYears} base={scenarios.base.paybackYears} optimistic={scenarios.optimistic.paybackYears} unit="yrs" />
                      <ScenarioRow label="DSCR (Yr1)" conservative={scenarios.conservative.dscr} base={scenarios.base.dscr} optimistic={scenarios.optimistic.dscr} unit="x" cap={99.9} />
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  tooltip?: string;
}

function NumberInput({ label, value, onChange, min, max, step, tooltip }: NumberInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-slate-300 text-xs">{label}</Label>
        {tooltip && (
          <UITooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-slate-500 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs bg-slate-900 border-slate-600">
              {tooltip}
            </TooltipContent>
          </UITooltip>
        )}
      </div>
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        min={min}
        max={max}
        step={step}
        className="bg-slate-900 border-slate-600 text-white h-9 text-sm"
      />
    </div>
  );
}

interface ResultCardProps {
  label: string;
  value: number | null;
  unit: string;
  decimals: number;
  highlight?: boolean;
  color?: 'emerald' | 'amber' | 'red' | 'white';
}

function ResultCard({ label, value, unit, decimals, highlight, color = 'white' }: ResultCardProps) {
  const colorClass = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    white: 'text-white',
  }[color];

  return (
    <div className={`rounded-lg p-4 ${highlight ? 'bg-emerald-900/20 border border-emerald-700/40' : 'bg-slate-800 border border-slate-700'}`}>
      <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-bold ${colorClass}`}>
        {value !== null ? `${value.toFixed(decimals)} ${unit}` : '—'}
      </div>
    </div>
  );
}

interface ScenarioRowProps {
  label: string;
  conservative: number | null;
  base: number | null;
  optimistic: number | null;
  unit: string;
  cap?: number;
}

function ScenarioRow({ label, conservative, base, optimistic, unit, cap }: ScenarioRowProps) {
  const fmt = (v: number | null) => {
    if (v === null) return '—';
    const capped = cap ? Math.min(v, cap) : v;
    return `${capped.toFixed(2)} ${unit}`;
  };

  return (
    <tr>
      <td className="text-slate-300 text-xs py-2 pr-4">{label}</td>
      <td className="text-right text-amber-300 text-xs py-2 px-3">{fmt(conservative)}</td>
      <td className="text-right text-slate-100 text-xs py-2 px-3 font-medium">{fmt(base)}</td>
      <td className="text-right text-emerald-300 text-xs py-2 px-3">{fmt(optimistic)}</td>
    </tr>
  );
}
