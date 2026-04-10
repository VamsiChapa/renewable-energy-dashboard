import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Zap, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/store/dashboardStore';
import { sendMessage, buildSystemPrompt } from '@/services/claude';

const SUGGESTED_QUESTIONS = [
  'What IRR should I expect for a 50 MW solar project in Texas?',
  'How does the IRA domestic content adder work for solar ITC?',
  'Compare my current project economics to industry benchmarks.',
  'What are the key risks for utility-scale wind projects in the Midwest?',
  'Explain how to structure tax equity financing for solar.',
  'What electricity price escalation rate is realistic for a 25-year PPA?',
];

export function ResearchAssistant() {
  const { chatHistory, addChatMessage, clearChatHistory, marketData, projectInputs, projectResults, selectedState } = useDashboardStore();
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, streamingContent]);

  const systemPrompt = buildSystemPrompt(marketData, projectInputs, projectResults, selectedState);

  const handleSend = async (messageText?: string) => {
    const text = messageText ?? inputValue.trim();
    if (!text || isStreaming) return;

    setInputValue('');
    setError(null);
    setStreamingContent('');

    addChatMessage({ role: 'user', content: text });

    const conversationHistory = chatHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setIsStreaming(true);
    let accumulated = '';

    await sendMessage(
      text,
      conversationHistory,
      systemPrompt,
      (chunk) => {
        accumulated += chunk;
        setStreamingContent(accumulated);
      },
      () => {
        addChatMessage({ role: 'assistant', content: accumulated });
        setStreamingContent('');
        setIsStreaming(false);
      },
      (errMsg) => {
        setError(errMsg);
        setIsStreaming(false);
        setStreamingContent('');
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const contextSummary = [
    marketData.avgElectricityPrice && `Elec: ${marketData.avgElectricityPrice.toFixed(1)}¢/kWh`,
    marketData.solarCapacityGW && `Solar: ${marketData.solarCapacityGW.toFixed(0)}GW`,
    `${projectInputs.systemSizeMW}MW ${projectInputs.projectType}`,
    projectResults.irr && `IRR: ${projectResults.irr.toFixed(1)}%`,
    selectedState.name && `State: ${selectedState.code}`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="h-6 w-6 text-emerald-400" />
            AI Research Assistant
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Powered by Claude — contextually aware of your market data and project scenario
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasApiKey && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
              Demo Mode
            </Badge>
          )}
          {chatHistory.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChatHistory}
              className="text-slate-400 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Context Pills */}
      {contextSummary.length > 0 && (
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Context injected:
          </span>
          {contextSummary.map((item, i) => (
            <Badge key={i} variant="outline" className="text-xs border-slate-600 text-slate-400 py-0 h-5">
              {item}
            </Badge>
          ))}
        </div>
      )}

      {/* Main Chat Area */}
      <Card className="bg-slate-800 border-slate-700 flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {chatHistory.length === 0 && !isStreaming && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-emerald-400/40 mx-auto mb-3" />
                <h3 className="text-slate-300 font-medium mb-1">Ready to analyze</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Ask me anything about renewable energy investments. I have access to your current project scenario and live market data.
                </p>
              </div>

              {/* Suggested questions */}
              <div>
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide font-medium">Suggested questions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="text-left text-sm text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg p-3 border border-slate-600 hover:border-emerald-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {isStreaming && streamingContent && (
            <MessageBubble role="assistant" content={streamingContent} isStreaming />
          )}

          {isStreaming && !streamingContent && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-900/40 border border-emerald-700 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about IRR, financing, IRA incentives, market trends..."
              disabled={isStreaming}
              className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 flex-1"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isStreaming}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {hasApiKey
              ? 'Using Claude API · Responses include market data context'
              : 'Demo mode: add VITE_ANTHROPIC_API_KEY to .env for live Claude responses'}
          </p>
        </div>
      </Card>
    </div>
  );
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAssistant
          ? 'bg-emerald-900/40 border border-emerald-700'
          : 'bg-slate-700 border border-slate-600'
      }`}>
        {isAssistant
          ? <Bot className="h-4 w-4 text-emerald-400" />
          : <User className="h-4 w-4 text-slate-300" />
        }
      </div>
      <div className={`flex-1 max-w-[85%] ${isAssistant ? '' : 'flex flex-col items-end'}`}>
        <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isAssistant
            ? 'bg-slate-700/60 text-slate-200 border border-slate-600'
            : 'bg-emerald-700/30 text-slate-100 border border-emerald-700/50'
        }`}>
          <MarkdownContent content={content} />
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-emerald-400 ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-like rendering for headers, bold, lists
  const lines = content.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} className="text-emerald-300 font-semibold mt-2 mb-1 text-sm">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="text-emerald-300 font-bold mt-2 mb-1">{line.slice(2)}</h2>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold text-slate-100">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>
              <span>{formatInline(line.slice(2))}</span>
            </div>
          );
        }
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1];
          return (
            <div key={i} className="flex gap-2">
              <span className="text-emerald-400 mt-0.5 flex-shrink-0 min-w-[16px]">{num}.</span>
              <span>{formatInline(line.replace(/^\d+\. /, ''))}</span>
            </div>
          );
        }
        if (line === '') return <div key={i} className="h-1" />;
        return <p key={i}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  // Handle **bold** inline
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
