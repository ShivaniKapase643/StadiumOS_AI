import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Users, DollarSign, Activity, ParkingSquare, Zap, ShieldAlert, Siren, Wrench, CloudSun } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { ChartCard } from '@/components/shared/ChartCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import { useChartInk, useChartSeriesColors } from '@/lib/chartColors';
import {
  useKpis,
  useAttendanceTrend,
  useRevenueTrend,
  useCrowdByZone,
  useTicketTierSplit,
  useUpcomingMatches,
  useRecentActivity,
} from './useDashboardData';

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useKpis();
  const { data: attendanceTrend = [] } = useAttendanceTrend();
  const { data: revenueTrend = [] } = useRevenueTrend();
  const { data: crowdByZone = [] } = useCrowdByZone();
  const { data: tierSplit = [] } = useTicketTierSplit();
  const { data: upcomingMatches = [] } = useUpcomingMatches();
  const { data: recentActivity = [] } = useRecentActivity();

  const seriesColors = useChartSeriesColors();
  const ink = useChartInk();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time operations overview across the venue.</p>
      </div>

      {kpisLoading || !kpis ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Attendance" value={formatNumber(kpis.attendance.scanned)} icon={Users} trend={`of ${formatNumber(kpis.attendance.totalIssued)} issued`} accent="primary" />
          <StatCard label="Revenue" value={formatCurrency(kpis.revenue.totalCollected)} icon={DollarSign} accent="success" />
          <StatCard label="Crowd Level" value={`${kpis.crowd.averageCapacityPct}%`} icon={Activity} trend="avg. capacity" accent="warning" />
          <StatCard label="Parking" value={`${kpis.parking.occupancyPct}%`} icon={ParkingSquare} trend={`${kpis.parking.occupied}/${kpis.parking.totalSlots} occupied`} accent="primary" />
          <StatCard label="Energy" value={`${formatNumber(kpis.energy.consumptionKwh)} kWh`} icon={Zap} trend={`${formatNumber(kpis.energy.solarGenKwh)} kWh solar`} accent="success" />
          <StatCard label="Security Alerts" value={String(kpis.security.openIncidents)} icon={ShieldAlert} accent={kpis.security.openIncidents > 0 ? 'destructive' : 'success'} />
          <StatCard label="Emergency Alerts" value={String(kpis.emergency.openAlerts)} icon={Siren} accent={kpis.emergency.openAlerts > 0 ? 'destructive' : 'success'} />
          <StatCard label="Maintenance" value={String(kpis.maintenance.openWorkOrders)} icon={Wrench} trend="open work orders" accent="warning" />
        </div>
      )}

      {kpis?.weather && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <CloudSun className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-medium">
                {kpis.weather.temperatureC}&deg;C &middot; {kpis.weather.condition}
              </p>
              <p className="text-xs text-muted-foreground">
                Wind {kpis.weather.windSpeedKmh} km/h &middot; Humidity {kpis.weather.humidityPct}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Attendance Trend" description="Live crowd count over time">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesColors[0]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={seriesColors[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: ink.muted }} tickFormatter={(v) => v.slice(11)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="attendance" stroke={seriesColors[0]} strokeWidth={2} fill="url(#attendanceFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Trend" description="Ticket revenue by day">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesColors[1]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={seriesColors[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke={seriesColors[1]} strokeWidth={2} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Crowd by Zone" description="Latest capacity reading per zone">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={crowdByZone} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="zoneName" width={110} tick={{ fontSize: 11, fill: ink.secondary }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `${v.toFixed(0)}%`} />
              <Bar dataKey="capacityPct" fill={seriesColors[0]} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ticket Sales by Tier" description="General / Premium / VIP split">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={tierSplit} dataKey="count" nameKey="tier" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {tierSplit.map((entry, index) => (
                  <Cell key={entry.tier} fill={seriesColors[index % seriesColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fixture</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Kickoff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingMatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No upcoming fixtures
                    </TableCell>
                  </TableRow>
                )}
                {upcomingMatches.map((fixture) => (
                  <TableRow key={fixture.id}>
                    <TableCell className="font-medium">
                      {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                    </TableCell>
                    <TableCell>{fixture.round}</TableCell>
                    <TableCell>{formatDateTime(fixture.scheduledAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity</p>}
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.action.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.user?.name ?? 'System'} &middot; {item.entityType}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {formatDateTime(item.createdAt)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
