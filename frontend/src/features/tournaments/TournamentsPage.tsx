import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleGate } from '@/components/shared/RoleGate';
import { MANAGE_TOURNAMENT_ROLES } from '@/lib/permissions';
import { formatDateTime } from '@/lib/utils';
import * as tournamentService from '@/services/tournament.service';
import { CreateTournamentDialog } from './CreateTournamentDialog';

const statusVariant: Record<string, 'default' | 'success' | 'secondary' | 'destructive'> = {
  UPCOMING: 'secondary',
  ONGOING: 'success',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

export default function TournamentsPage() {
  const { data: tournaments = [], isLoading } = useQuery({ queryKey: ['tournaments'], queryFn: tournamentService.listTournaments });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tournament Management</h1>
          <p className="text-sm text-muted-foreground">Manage tournaments, fixtures, and live scoring.</p>
        </div>
        <RoleGate roles={MANAGE_TOURNAMENT_ROLES}>
          <CreateTournamentDialog />
        </RoleGate>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className="h-4 w-4 text-primary" /> {t.name}
                    </CardTitle>
                    <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> {formatDateTime(t.startDate)} &rarr; {formatDateTime(t.endDate)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> {t.teams.length} teams
                  </p>
                  <p className="text-xs">{t.sport}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {tournaments.length === 0 && <p className="text-sm text-muted-foreground">No tournaments yet.</p>}
        </div>
      )}
    </div>
  );
}
