import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
}

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({ label, value, icon: Icon, trend, trendDirection = 'neutral', accent = 'primary' }: StatCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card>
        <CardContent className="flex items-start justify-between p-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trendDirection === 'up' && 'text-success',
                  trendDirection === 'down' && 'text-destructive',
                  trendDirection === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trend}
              </p>
            )}
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', accentClasses[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
