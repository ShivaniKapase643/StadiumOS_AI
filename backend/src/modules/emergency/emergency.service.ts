import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { SOSStatus, SOSType } from '@prisma/client';
import { emitToAll } from '../../sockets';
import { SOCKET_EVENTS } from '../../sockets/events';

export async function listSosAlerts() {
  return prisma.sOSAlert.findMany({
    include: { user: { select: { name: true } }, zone: true, ambulanceDispatch: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function createSosAlert(userId: string, input: { type: SOSType; zoneId?: string }) {
  const alert = await prisma.sOSAlert.create({ data: { userId, ...input } });
  emitToAll(SOCKET_EVENTS.ALERT_NEW, { id: alert.id, type: alert.type, zoneId: alert.zoneId, createdAt: alert.createdAt });
  return alert;
}

export async function dispatchAmbulance(sosAlertId: string, driverName?: string) {
  const alert = await prisma.sOSAlert.findUnique({ where: { id: sosAlertId } });
  if (!alert) throw ApiError.notFound('SOS alert not found');

  await prisma.sOSAlert.update({ where: { id: sosAlertId }, data: { status: SOSStatus.DISPATCHED } });
  return prisma.ambulanceDispatch.create({ data: { sosAlertId, driverName } });
}

export async function resolveSosAlert(sosAlertId: string) {
  const alert = await prisma.sOSAlert.findUnique({ where: { id: sosAlertId } });
  if (!alert) throw ApiError.notFound('SOS alert not found');
  return prisma.sOSAlert.update({ where: { id: sosAlertId }, data: { status: SOSStatus.RESOLVED, resolvedAt: new Date() } });
}

export async function listEvacuationPlans() {
  return prisma.evacuationPlan.findMany();
}
