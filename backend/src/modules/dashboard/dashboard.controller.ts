import { Request, Response } from 'express';
import * as dashboardService from './dashboard.service';
import { ok } from '../../utils/apiResponse';

export async function kpisHandler(_req: Request, res: Response) {
  ok(res, await dashboardService.getKpis());
}

export async function attendanceTrendHandler(_req: Request, res: Response) {
  ok(res, await dashboardService.getAttendanceTrend());
}

export async function revenueTrendHandler(_req: Request, res: Response) {
  ok(res, await dashboardService.getRevenueTrend());
}

export async function crowdByZoneHandler(_req: Request, res: Response) {
  ok(res, await dashboardService.getCrowdByZone());
}

export async function ticketTierSplitHandler(_req: Request, res: Response) {
  ok(res, await dashboardService.getTicketTierSplit());
}

export async function upcomingMatchesHandler(_req: Request, res: Response) {
  ok(res, await dashboardService.getUpcomingMatches());
}

export async function recentActivityHandler(_req: Request, res: Response) {
  ok(res, await dashboardService.getRecentActivity());
}
