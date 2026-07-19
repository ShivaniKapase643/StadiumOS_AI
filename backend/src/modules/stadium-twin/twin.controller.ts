import { Request, Response } from 'express';
import * as twinService from './twin.service';
import { created, ok } from '../../utils/apiResponse';
import { ZoneType } from '@prisma/client';
import { logAudit } from '../../modules/users/audit.service';

export async function overviewHandler(req: Request, res: Response) {
  ok(res, await twinService.getStadiumOverview(req.query.stadiumId as string | undefined));
}

export async function listZonesHandler(req: Request, res: Response) {
  ok(res, await twinService.listZones(req.params.stadiumId, req.query.type as ZoneType | undefined));
}

export async function createZoneHandler(req: Request, res: Response) {
  const zone = await twinService.createZone(req.body);
  await logAudit(req.user?.sub, 'CREATE_ZONE', 'StadiumZone', zone.id);
  created(res, zone);
}

export async function updateZoneStatusHandler(req: Request, res: Response) {
  const zone = await twinService.updateZoneStatus(req.params.zoneId, req.body.status);
  await logAudit(req.user?.sub, 'UPDATE_ZONE_STATUS', 'StadiumZone', zone.id, { status: req.body.status });
  ok(res, zone);
}

export async function deleteZoneHandler(req: Request, res: Response) {
  await twinService.deleteZone(req.params.zoneId);
  ok(res, { message: 'Zone deleted' });
}

export async function liveSnapshotHandler(req: Request, res: Response) {
  ok(res, await twinService.getLiveSnapshot(req.params.stadiumId));
}

export async function replayTimeRangeHandler(req: Request, res: Response) {
  ok(res, await twinService.getReplayTimeRange(req.params.stadiumId));
}

export async function replaySnapshotHandler(req: Request, res: Response) {
  const at = req.query.at ? new Date(req.query.at as string) : new Date();
  ok(res, await twinService.getReplaySnapshot(req.params.stadiumId, at));
}
