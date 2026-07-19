import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Seat, SeatTier } from '@/types';

const TIER_COLOR: Record<SeatTier, string> = {
  GENERAL: 'bg-primary/20 border-primary/40 text-primary',
  PREMIUM: 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-400',
  VIP: 'bg-violet-500/20 border-violet-500/40 text-violet-700 dark:text-violet-400',
};

interface SeatMapProps {
  seats: Seat[];
  selectedSeatIds: Set<string>;
  onToggleSeat: (seat: Seat) => void;
  maxSelectable: number;
}

export function SeatMap({ seats, selectedSeatIds, onToggleSeat, maxSelectable }: SeatMapProps) {
  const bySection = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const seat of seats) {
      if (!map.has(seat.section)) map.set(seat.section, []);
      map.get(seat.section)!.push(seat);
    }
    return map;
  }, [seats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 text-xs">
        {(['GENERAL', 'PREMIUM', 'VIP'] as SeatTier[]).map((tier) => (
          <div key={tier} className="flex items-center gap-1.5">
            <span className={cn('h-3 w-3 rounded-sm border', TIER_COLOR[tier])} />
            {tier}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border bg-muted" />
          Booked
        </div>
      </div>

      {Array.from(bySection.entries()).map(([section, sectionSeats]) => {
        const rows = new Map<string, Seat[]>();
        for (const s of sectionSeats) {
          if (!rows.has(s.row)) rows.set(s.row, []);
          rows.get(s.row)!.push(s);
        }

        return (
          <div key={section} className="space-y-2">
            <p className="text-sm font-medium">Section {section}</p>
            <div className="space-y-1 overflow-x-auto pb-2">
              {Array.from(rows.entries()).map(([row, rowSeats]) => (
                <div key={row} className="flex items-center gap-1">
                  <span className="w-5 shrink-0 text-[10px] text-muted-foreground">{row}</span>
                  {rowSeats
                    .sort((a, b) => a.number - b.number)
                    .map((seat) => {
                      const isSelected = selectedSeatIds.has(seat.id);
                      const disabled = seat.isBooked || (!isSelected && selectedSeatIds.size >= maxSelectable);
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => onToggleSeat(seat)}
                          title={`${section}-${row}${seat.number} (${seat.tier})`}
                          aria-label={`Seat ${section}-${row}${seat.number}, ${seat.tier}${seat.isBooked ? ', already booked' : isSelected ? ', selected' : ''}`}
                          aria-pressed={isSelected}
                          className={cn(
                            'h-6 w-6 shrink-0 rounded-sm border text-[9px] font-medium transition-colors disabled:cursor-not-allowed',
                            seat.isBooked ? 'bg-muted text-muted-foreground' : TIER_COLOR[seat.tier],
                            isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                          )}
                        >
                          {seat.number}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
