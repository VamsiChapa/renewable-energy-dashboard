import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-emerald-500 border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  );
}

export function MetricSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-slate-700 rounded w-24" />
      <div className="h-8 bg-slate-700 rounded w-32" />
      <div className="h-3 bg-slate-700 rounded w-20" />
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="h-full bg-slate-800 rounded-lg flex items-center justify-center">
        <div className="text-slate-600 text-sm">Loading chart data...</div>
      </div>
    </div>
  );
}
