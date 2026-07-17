import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Droplets, Recycle, Leaf } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { ChartCard } from '@/components/shared/ChartCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useChartInk, useChartSeriesColors } from '@/lib/chartColors';
import { formatDateTime } from '@/lib/utils';
import * as sustainabilityService from '@/services/sustainability.service';

export default function SustainabilityPage() {
  const { data, isLoading } = useQuery({ queryKey: ['sustainability', 'summary'], queryFn: sustainabilityService.getSummary });
  const seriesColors = useChartSeriesColors();
  const ink = useChartInk();

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sustainability Dashboard</h1>
        <p className="text-sm text-muted-foreground">Energy, water, waste, and carbon footprint tracking.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Energy Consumption"
          value={`${data.energy.latest?.consumptionKwh.toLocaleString() ?? 0} kWh`}
          icon={Zap}
          trend={`${data.energy.latest?.solarGenKwh.toLocaleString() ?? 0} kWh solar`}
          accent="warning"
        />
        <StatCard label="Water Usage" value={`${data.water.latest?.usageLiters.toLocaleString() ?? 0} L`} icon={Droplets} accent="primary" />
        <StatCard label="Recycling Rate" value={`${data.waste.recyclingRatePct}%`} icon={Recycle} trend={`${data.waste.totalKg.toFixed(0)} kg total waste`} accent="success" />
        <StatCard label="Carbon Footprint" value={`${data.carbon.latest?.co2eKg.toLocaleString() ?? 0} kg CO₂e`} icon={Leaf} accent="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Energy: Consumption vs. Solar Generation">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.energy.trend}>
              <defs>
                <linearGradient id="consumptionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesColors[0]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={seriesColors[0]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesColors[1]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={seriesColors[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: ink.muted }} tickFormatter={(v) => formatDateTime(v).slice(0, 6)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="consumptionKwh" name="Consumption" stroke={seriesColors[0]} fill="url(#consumptionFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="solarGenKwh" name="Solar" stroke={seriesColors[1]} fill="url(#solarFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Carbon Footprint Trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.carbon.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: ink.muted }} tickFormatter={(v) => formatDateTime(v).slice(0, 6)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `${v} kg CO₂e`} />
              <Line type="monotone" dataKey="co2eKg" stroke={seriesColors[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
