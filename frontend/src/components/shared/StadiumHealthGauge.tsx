import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StadiumHealthScore } from '@/services/dashboard.service';

const STATUS_COLOR: Record<string, string> = {
  green: 'stroke-success text-success',
  yellow: 'stroke-warning text-warning',
  orange: 'stroke-orange-500 text-orange-500',
  red: 'stroke-destructive text-destructive',
};

const STATUS_LABEL: Record<string, string> = {
  green: 'Nominal',
  yellow: 'Caution',
  orange: 'Elevated',
  red: 'Critical',
};

const CATEGORY_LABEL: Record<string, string> = {
  security: 'Security',
  crowd: 'Crowd',
  parking: 'Parking',
  medical: 'Medical',
  energy: 'Energy',
  maintenance: 'Maintenance',
};

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function StadiumHealthGauge({ health }: { health: StadiumHealthScore }) {
  const prefersReducedMotion = useReducedMotion();
  const offset = CIRCUMFERENCE * (1 - health.overall / 100);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={RADIUS} strokeWidth="10" className="fill-none stroke-muted" />
          <motion.circle
            cx="60"
            cy="60"
            r={RADIUS}
            strokeWidth="10"
            strokeLinecap="round"
            className={cn('fill-none', STATUS_COLOR[health.overallStatus])}
            style={{ strokeDasharray: CIRCUMFERENCE }}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{health.overall}%</span>
          <span className={cn('text-[10px] font-medium uppercase tracking-wide', STATUS_COLOR[health.overallStatus])}>
            {STATUS_LABEL[health.overallStatus]}
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
        {(Object.keys(health.categories) as Array<keyof StadiumHealthScore['categories']>).map((key) => {
          const cat = health.categories[key];
          return (
            <div key={key} className="rounded-md border border-border p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{CATEGORY_LABEL[key]}</p>
              <p className={cn('text-lg font-semibold', STATUS_COLOR[cat.status])}>{cat.score}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
