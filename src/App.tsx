import { useState, useEffect } from 'react';
import { BarChart2, Calculator, Bot, Map } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { MarketOverview } from '@/components/tabs/MarketOverview';
import { ProjectEconomics } from '@/components/tabs/ProjectEconomics';
import { ResearchAssistant } from '@/components/tabs/ResearchAssistant';
import { GeographicVisualization } from '@/components/tabs/GeographicVisualization';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/hooks/use-toast';

const TABS = [
  { id: 'market', label: 'Market Overview', icon: BarChart2 },
  { id: 'economics', label: 'Project Economics', icon: Calculator },
  { id: 'research', label: 'Research Assistant', icon: Bot },
  { id: 'geographic', label: 'Geographic', icon: Map },
] as const;

type TabId = typeof TABS[number]['id'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('market');
  const { notification, setNotification } = useDashboardStore();
  const { toast } = useToast();

  // Show cross-tab notifications as toasts
  useEffect(() => {
    if (notification) {
      toast({
        title: 'Data Updated',
        description: notification,
      });
      setNotification(null);
    }
  }, [notification, toast, setNotification]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Top Navigation */}
        <header className="border-b border-slate-700/60 bg-slate-900/95 backdrop-blur sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
            {/* Brand */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RE</span>
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-white leading-none">
                    US Renewable Energy
                  </h1>
                  <p className="text-xs text-slate-400 leading-none mt-0.5">Investment Analysis Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live EIA + FRED Data
              </div>
            </div>

            {/* Tab Navigation */}
            <nav className="flex gap-1 pb-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                      isActive
                        ? 'text-emerald-400 border-emerald-400 bg-slate-800/50'
                        : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          {activeTab === 'market' && <MarketOverview />}
          {activeTab === 'economics' && <ProjectEconomics />}
          {activeTab === 'research' && <ResearchAssistant />}
          {activeTab === 'geographic' && <GeographicVisualization />}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 mt-8 py-4 text-center text-xs text-slate-600">
          Data sources: EIA Open Data API · FRED Economic Data · NREL PVWatts API · Anthropic Claude AI
        </footer>

        <Toaster />
      </div>
    </TooltipProvider>
  );
}
