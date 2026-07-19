import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as tournamentService from '@/services/tournament.service';

/**
 * AI Tournament Predictor, inline per fixture row — win probability and
 * expected score from real LeaderboardEntry standings (see
 * predictor.service.ts). For a COMPLETED fixture, shows the actual result
 * instead (the backend refuses to "predict" a match retroactively).
 */
export function FixturePredictionCell({ fixtureId }: { fixtureId: string }) {
  const { data: prediction } = useQuery({
    queryKey: ['tournaments', 'predict', fixtureId],
    queryFn: () => tournamentService.predictFixture(fixtureId),
  });

  if (!prediction) return <span className="text-xs text-muted-foreground">—</span>;

  if (prediction.isActual) {
    return (
      <Badge variant="outline" className="text-[10px]">
        Final: {prediction.actualHomeGoals}-{prediction.actualAwayGoals}
      </Badge>
    );
  }

  const favored = prediction.homeWinPct >= prediction.awayWinPct ? prediction.homeTeam : prediction.awayTeam;

  return (
    <div className="space-y-1" title={prediction.basis}>
      <div className="flex items-center gap-1 text-xs">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="font-medium">{favored}</span>
        <span className="text-muted-foreground">
          {prediction.homeWinPct}% / {prediction.drawPct}% / {prediction.awayWinPct}%
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Expected {prediction.expectedHomeGoals}-{prediction.expectedAwayGoals} &middot; {prediction.confidencePct}% confidence
      </p>
    </div>
  );
}
