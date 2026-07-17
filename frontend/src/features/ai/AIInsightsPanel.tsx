import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocketEvent } from '@/hooks/useSocket';
import * as aiService from '@/services/ai.service';

const SEVERITY_META = {
  critical: { icon: ShieldAlert, badge: 'destructive' as const, label: 'Critical' },
  warning: { icon: AlertTriangle, badge: 'warning' as const, label: 'Warning' },
  info: { icon: Info, badge: 'secondary' as const, label: 'Info' },
};

export function AIInsightsPanel({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: aiService.getInsights,
    refetchInterval: 20_000,
  });

  useSocketEvent('crowd:update', () => queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] }));
  useSocketEvent('alert:new', () => queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] }));
  useSocketEvent('parking:update', () => queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] }));

  const items = compact ? insights.slice(0, 5) : insights;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> AI Operational Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights yet.</p>
        ) : (
          items.map((insight) => {
            const meta = SEVERITY_META[insight.severity];
            return (
              <div key={insight.id} className="flex gap-3 rounded-lg border border-border p-3">
                <meta.icon className={`mt-0.5 h-4 w-4 shrink-0 ${insight.severity === 'critical' ? 'text-destructive' : insight.severity === 'warning' ? 'text-warning' : 'text-muted-foreground'}`} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <Badge variant={meta.badge} className="text-[10px]">
                      {insight.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{insight.recommendation}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
