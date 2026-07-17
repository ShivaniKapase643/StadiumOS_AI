import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as dashboardService from '@/services/dashboard.service';
import { useSocketEvent } from '@/hooks/useSocket';

export function useKpis() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['dashboard', 'kpis'], queryFn: dashboardService.getKpis, refetchInterval: 20_000 });

  useSocketEvent('crowd:update', () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] }));
  useSocketEvent('parking:update', () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] }));
  useSocketEvent('alert:new', () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] }));
  useSocketEvent('ticket:scanned', () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] }));

  return query;
}

export function useAttendanceTrend() {
  return useQuery({ queryKey: ['dashboard', 'attendance-trend'], queryFn: dashboardService.getAttendanceTrend, refetchInterval: 30_000 });
}

export function useRevenueTrend() {
  return useQuery({ queryKey: ['dashboard', 'revenue-trend'], queryFn: dashboardService.getRevenueTrend });
}

export function useCrowdByZone() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['dashboard', 'crowd-by-zone'], queryFn: dashboardService.getCrowdByZone, refetchInterval: 20_000 });
  useSocketEvent('crowd:update', () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'crowd-by-zone'] }));
  return query;
}

export function useTicketTierSplit() {
  return useQuery({ queryKey: ['dashboard', 'ticket-tier-split'], queryFn: dashboardService.getTicketTierSplit });
}

export function useUpcomingMatches() {
  return useQuery({ queryKey: ['dashboard', 'upcoming-matches'], queryFn: dashboardService.getUpcomingMatches });
}

export function useRecentActivity() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const id = setInterval(() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-activity'] }), 30_000);
    return () => clearInterval(id);
  }, [queryClient]);
  return useQuery({ queryKey: ['dashboard', 'recent-activity'], queryFn: dashboardService.getRecentActivity });
}
