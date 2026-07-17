import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartCard } from '@/components/shared/ChartCard';
import { useChartInk, useChartSeriesColors } from '@/lib/chartColors';
import { useSocketEvent } from '@/hooks/useSocket';
import * as crowdService from '@/services/crowdIntelligence.service';

const RISK_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  LOW: 'success',
  MODERATE: 'default',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

const QUEUE_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  CLEAR: 'success',
  BUSY: 'warning',
  CONGESTED: 'destructive',
};

export default function CrowdIntelligencePage() {
  const queryClient = useQueryClient();
  const seriesColors = useChartSeriesColors();
  const ink = useChartInk();

  const { data: congestion = [], isLoading: congestionLoading } = useQuery({
    queryKey: ['crowd-intel', 'congestion'],
    queryFn: crowdService.getCongestion,
    refetchInterval: 15_000,
  });
  const { data: queues = [] } = useQuery({ queryKey: ['crowd-intel', 'queues'], queryFn: crowdService.getQueues, refetchInterval: 15_000 });
  const { data: peakHours = [] } = useQuery({ queryKey: ['crowd-intel', 'peak-hours'], queryFn: crowdService.getPeakHours });

  useSocketEvent('crowd:update', () => {
    queryClient.invalidateQueries({ queryKey: ['crowd-intel'] });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crowd Intelligence</h1>
        <p className="text-sm text-muted-foreground">AI-simulated congestion prediction, queue monitoring, and peak-hour analysis.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Congestion Prediction</CardTitle>
        </CardHeader>
        <CardContent>
          {congestionLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Predicted Next</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {congestion.map((c) => (
                  <TableRow key={c.zoneId}>
                    <TableCell className="font-medium">{c.zoneName}</TableCell>
                    <TableCell>{c.currentPct.toFixed(0)}%</TableCell>
                    <TableCell>{c.trendPerReading > 0 ? `+${c.trendPerReading}` : c.trendPerReading}%/reading</TableCell>
                    <TableCell>{c.predictedNextPct.toFixed(0)}%</TableCell>
                    <TableCell>
                      <Badge variant={RISK_VARIANT[c.riskLevel]}>{c.riskLevel}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gate Queue Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gate</TableHead>
                <TableHead>Queue Length</TableHead>
                <TableHead>Est. Wait</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((q) => (
                <TableRow key={q.zoneId}>
                  <TableCell className="font-medium">{q.zoneName}</TableCell>
                  <TableCell>{q.queueLength}</TableCell>
                  <TableCell>{q.estimatedWaitMinutes} min</TableCell>
                  <TableCell>
                    <Badge variant={QUEUE_VARIANT[q.status]}>{q.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ChartCard title="Peak Hour Analysis" description="Average capacity by hour of day (UTC)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={peakHours}>
            <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} tickFormatter={(h) => `${h}:00`} />
            <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `${v}%`} labelFormatter={(h) => `${h}:00 UTC`} />
            <Bar dataKey="averageCapacityPct" fill={seriesColors[0]} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
