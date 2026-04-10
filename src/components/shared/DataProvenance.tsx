import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DataProvenanceProps {
  source: string;
  lastUpdated?: Date | string | null;
  isMock?: boolean;
  className?: string;
}

export function DataProvenance({ source, lastUpdated, isMock, className }: DataProvenanceProps) {
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className={`flex items-center gap-2 text-xs text-slate-500 ${className ?? ''}`}>
      {isMock && (
        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400 py-0 h-5">
          Sample Data
        </Badge>
      )}
      <span className="flex items-center gap-1">
        <Info className="h-3 w-3" />
        {source}
        {formattedDate && ` · ${formattedDate}`}
      </span>
    </div>
  );
}

interface SourceCitationProps {
  sources: Array<{ name: string; url?: string; description?: string }>;
}

export function SourceCitation({ sources }: SourceCitationProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {sources.map((source) => (
        <Tooltip key={source.name}>
          <TooltipTrigger>
            <Badge
              variant="outline"
              className="text-xs border-slate-600 text-slate-400 cursor-help hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
            >
              {source.name}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-xs">
              {source.description || source.name}
              {source.url && (
                <span className="block text-slate-400 mt-1">{source.url}</span>
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
