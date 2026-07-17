import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleGate } from '@/components/shared/RoleGate';
import { MANAGE_TOURNAMENT_ROLES, SCORE_MATCH_ROLES } from '@/lib/permissions';
import { formatDateTime } from '@/lib/utils';
import { useSocketEvent } from '@/hooks/useSocket';
import * as tournamentService from '@/services/tournament.service';
import { AddTeamDialog } from './AddTeamDialog';
import { GenerateScheduleDialog } from './GenerateScheduleDialog';
import { UpdateScoreDialog } from './UpdateScoreDialog';

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentService.getTournament(id!),
    enabled: Boolean(id),
  });

  useSocketEvent('match:score-update', () => {
    queryClient.invalidateQueries({ queryKey: ['tournament', id] });
  });

  if (isLoading || !tournament) return <Skeleton className="h-96 w-full" />;

  const fixturesByRound = tournament.fixtures?.reduce<Record<string, typeof tournament.fixtures>>((acc, f) => {
    (acc[f.round] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Link to="/tournaments" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to tournaments
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{tournament.name}</h1>
          <Badge>{tournament.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {tournament.sport} &middot; {formatDateTime(tournament.startDate)} &rarr; {formatDateTime(tournament.endDate)}
        </p>
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-end">
            <RoleGate roles={MANAGE_TOURNAMENT_ROLES}>
              <AddTeamDialog tournamentId={tournament.id} />
            </RoleGate>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournament.teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle className="text-base">{team.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {team.group && <p>Group {team.group}</p>}
                  <p>{team.players?.length ?? 0} players</p>
                </CardContent>
              </Card>
            ))}
            {tournament.teams.length === 0 && <p className="text-sm text-muted-foreground">No teams added yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="fixtures" className="space-y-4">
          <div className="flex justify-end">
            <RoleGate roles={MANAGE_TOURNAMENT_ROLES}>
              <GenerateScheduleDialog tournamentId={tournament.id} />
            </RoleGate>
          </div>
          {!fixturesByRound || Object.keys(fixturesByRound).length === 0 ? (
            <p className="text-sm text-muted-foreground">No fixtures yet — generate a schedule to get started.</p>
          ) : (
            Object.entries(fixturesByRound).map(([round, fixtures]) => (
              <Card key={round}>
                <CardHeader>
                  <CardTitle className="text-sm">{round}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fixture</TableHead>
                        <TableHead>Kickoff</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixtures?.map((fixture) => (
                        <TableRow key={fixture.id}>
                          <TableCell className="font-medium">
                            {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                          </TableCell>
                          <TableCell>{formatDateTime(fixture.scheduledAt)}</TableCell>
                          <TableCell>
                            {fixture.match ? `${fixture.match.homeScore} - ${fixture.match.awayScore}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{fixture.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <RoleGate roles={SCORE_MATCH_ROLES}>
                              <UpdateScoreDialog fixture={fixture} tournamentId={tournament.id} />
                            </RoleGate>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>P</TableHead>
                    <TableHead>W</TableHead>
                    <TableHead>D</TableHead>
                    <TableHead>L</TableHead>
                    <TableHead>GF</TableHead>
                    <TableHead>GA</TableHead>
                    <TableHead>Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tournament.standings ?? [])
                    .slice()
                    .sort((a, b) => b.points - a.points || b.goalsFor - a.goalsFor)
                    .map((entry, idx) => (
                      <TableRow key={entry.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{entry.team.name}</TableCell>
                        <TableCell>{entry.played}</TableCell>
                        <TableCell>{entry.won}</TableCell>
                        <TableCell>{entry.drawn}</TableCell>
                        <TableCell>{entry.lost}</TableCell>
                        <TableCell>{entry.goalsFor}</TableCell>
                        <TableCell>{entry.goalsAgainst}</TableCell>
                        <TableCell className="font-semibold">{entry.points}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
