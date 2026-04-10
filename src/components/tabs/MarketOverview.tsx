import { useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Zap, Wind, Sun, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricSkeleton, ChartSkeleton } from '@/components/shared/LoadingSpinner';
import { DataProvenance } from '@/components/shared/DataProvenance';
import { useDashboardStore } from '@/store/dashboardStore';
import { fetchElectricityPrices, fetchCapacityData } from '@/services/eia';
import { fetchTreasuryRate, fetchCPIInflation } from '@/services/fred';

export function MarketOverview() {
  const {
    marketData,
    marketDataLoading,
    marketDataError,
    setMarketData,
    setMarketDataLoading,
    setMarketDataError,
  } = useDashboardStore();

  const loadMarketData = useCallback(async () => {
    setMarketDataLoading(true);
    setMarketDataError(null);

    try {
      const [priceData, capacityData, treasuryData, cpiData] = await Promise.allSettled([
        fetchElectricityPrices(),
        fetchCapacityData(),
        fetchTreasuryRate(),
        fetchCPIInflation(),
      ]);

      const updates: Parameters<typeof setMarketData>[0] = {
        lastUpdated: new Date(),
      };

      if (priceData.status === 'fulfilled') {
        updates.avgElectricityPrice = priceData.value.avgPrice;
        updates.priceHistory = priceData.value.priceHistory;
        updates.priceYoYChange = priceData.value.yoyChange;
      }

      if (capacityData.status === 'fulfilled') {
        updates.solarCapacityGW = capacityData.value.solarGW;
        updates.windCapacityGW = capacityData.value.windGW;
        updates.capacityHistory = capacityData.value.capacityHistory;
        updates.solarYoYChange = capacityData.value.solarYoYChange;
        updates.windYoYChange = capacityData.value.windYoYChange;
      }

      if (treasuryData.status === 'fulfilled') {
        updates.treasuryRate = treasuryData.value.rate;
      }

      if (cpiData.status === 'fulfilled') {
        updates.cpiInflation = cpiData.value.cpi;
      }

      setMarketData(updates);
    } catch (error) {
      setMarketDataError('Failed to load market data. Showing sample data.');
    } finally {
      setMarketDataLoading(false);
    }
  }, [setMarketData, setMarketDataLoading, setMarketDataError]);

  useEffect(() => {
    if (!marketData.lastUpdated) {
      loadMarketData();
    }
  }, [marketData.lastUpdated, loadMarketData]);

  const hasApiKey = !!(
    import.meta.env.VITE_EIA_API_KEY ||
    import.meta.env.VITE_FRED_API_KEY
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">US Renewable Energy Market</h2>
          <p className="text-slate-400 text-sm mt-1">
            Live data from EIA Open Data API and FRED Economic Data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!hasApiKey && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-400">
              Sample Data Mode
            </Badge>
          )}
          {marketData.lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated {new Date(marketData.lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadMarketData}
            disabled={marketDataLoading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${marketDataLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {marketDataError && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm flex items-center justify-between">
          <span>{marketDataError}</span>
          <Button variant="ghost" size="sm" onClick={loadMarketData} className="text-red-300 hover:text-red-200">
            Retry
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Electricity Price"
          value={marketData.avgElectricityPrice}
          unit="¢/kWh"
          change={marketData.priceYoYChange}
          icon={<Zap className="h-5 w-5 text-yellow-400" />}
          loading={marketDataLoading}
          source="EIA"
          decimals={2}
        />
        <MetricCard
          title="Solar Capacity"
          value={marketData.solarCapacityGW}
          unit="GW"
          change={marketData.solarYoYChange}
          icon={<Sun className="h-5 w-5 text-emerald-400" />}
          loading={marketDataLoading}
          source="EIA"
          decimals={1}
        />
        <MetricCard
          title="Wind Capacity"
          value={marketData.windCapacityGW}
          unit="GW"
          change={marketData.windYoYChange}
          icon={<Wind className="h-5 w-5 text-blue-400" />}
          loading={marketDataLoading}
          source="EIA"
          decimals={1}
        />
        <MetricCard
          title="10Y Treasury Rate"
          value={marketData.treasuryRate}
          unit="%"
          icon={<DollarSign className="h-5 w-5 text-purple-400" />}
          loading={marketDataLoading}
          source="FRED"
          decimals={2}
          subtitle={marketData.cpiInflation !== null ? `CPI YoY: ${marketData.cpiInflation.toFixed(1)}%` : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Electricity Price Trend */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Retail Electricity Price Trend</CardTitle>
            <CardDescription className="text-slate-400">
              National average, all sectors — last 24 months (¢/kWh)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {marketDataLoading ? (
              <ChartSkeleton height={240} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={marketData.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)} // show MM only
                    interval={3}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${v.toFixed(1)}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#10b981' }}
                    formatter={(value: number) => [`${value.toFixed(2)} ¢/kWh`, 'Price']}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            <DataProvenance source="EIA Retail Sales API" lastUpdated={marketData.lastUpdated} isMock={!hasApiKey} />
          </CardContent>
        </Card>

        {/* Renewable Capacity Growth */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Renewable Capacity Growth</CardTitle>
            <CardDescription className="text-slate-400">
              Installed nameplate capacity by year (GW)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {marketDataLoading ? (
              <ChartSkeleton height={240} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={marketData.capacityHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v: number) => `${v}GW`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)} GW`, name === 'solar' ? 'Solar' : 'Wind']}
                  />
                  <Legend
                    wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
                    formatter={(value: string) => value === 'solar' ? 'Solar' : 'Wind'}
                  />
                  <Bar dataKey="solar" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="wind" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <DataProvenance source="EIA Electric Power Operational Data" lastUpdated={marketData.lastUpdated} isMock={!hasApiKey} />
          </CardContent>
        </Card>
      </div>

      {/* FRED Economic Context */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Economic Context for Project Finance</CardTitle>
          <CardDescription className="text-slate-400">
            Key macroeconomic indicators relevant to renewable energy investment underwriting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <EconContextItem
              label="10-Year Treasury (Risk-Free Rate)"
              value={marketData.treasuryRate !== null ? `${marketData.treasuryRate.toFixed(2)}%` : 'N/A'}
              description="Benchmark for project discount rates. Most utility-scale renewable projects use WACC of 7-10%, targeting a spread above Treasury."
              source="FRED DGS10"
              loading={marketDataLoading}
            />
            <EconContextItem
              label="CPI Inflation (Year-over-Year)"
              value={marketData.cpiInflation !== null ? `${marketData.cpiInflation.toFixed(2)}%` : 'N/A'}
              description="Affects O&M cost escalation, PPA escalator assumptions, and real vs. nominal return calculations."
              source="FRED CPIAUCSL"
              loading={marketDataLoading}
            />
            <EconContextItem
              label="Implied Real Rate"
              value={
                marketData.treasuryRate !== null && marketData.cpiInflation !== null
                  ? `${(marketData.treasuryRate - marketData.cpiInflation).toFixed(2)}%`
                  : 'N/A'
              }
              description="10Y Treasury minus CPI. Negative real rates historically support renewable capital investment by compressing hurdle rates."
              source="Calculated"
              loading={marketDataLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | null;
  unit: string;
  change?: number | null;
  icon: React.ReactNode;
  loading: boolean;
  source: string;
  decimals: number;
  subtitle?: string;
}

function MetricCard({ title, value, unit, change, icon, loading, source, decimals, subtitle }: MetricCardProps) {
  const isPositive = change !== null && change !== undefined && change > 0;
  const isNegative = change !== null && change !== undefined && change < 0;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-5">
        {loading ? (
          <MetricSkeleton />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">{title}</span>
              {icon}
            </div>
            <div className="text-2xl font-bold text-white">
              {value !== null ? `${value.toFixed(decimals)} ${unit}` : 'N/A'}
            </div>
            <div className="flex items-center gap-2">
              {change !== null && change !== undefined && (
                <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'}`}>
                  {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : isNegative ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                  {Math.abs(change).toFixed(1)}% YoY
                </span>
              )}
              {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
              {!change && !subtitle && <span className="text-xs text-slate-500">{source}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EconContextItemProps {
  label: string;
  value: string;
  description: string;
  source: string;
  loading: boolean;
}

function EconContextItem({ label, value, description, source, loading }: EconContextItemProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</div>
      {loading ? (
        <div className="animate-pulse h-7 bg-slate-700 rounded w-24" />
      ) : (
        <div className="text-xl font-bold text-emerald-400">{value}</div>
      )}
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      <Badge variant="outline" className="text-xs border-slate-600 text-slate-500 py-0 h-5">{source}</Badge>
    </div>
  );
}
