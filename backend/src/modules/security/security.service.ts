import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { IncidentSeverity, IncidentStatus, Role } from '@prisma/client';
import { emitToAll } from '../../sockets';
import { SOCKET_EVENTS } from '../../sockets/events';

export async function listIncidents() {
  return prisma.incident.findMany({
    include: { reportedBy: { select: { name: true } }, assignedTo: { select: { name: true } }, zone: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createIncident(
  reportedById: string,
  input: { type: string; severity: IncidentSeverity; description: string; zoneId?: string }
) {
  return prisma.incident.create({ data: { reportedById, ...input } });
}

export async function updateIncidentStatus(incidentId: string, status: IncidentStatus, assignedToId?: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw ApiError.notFound('Incident not found');
  return prisma.incident.update({
    where: { id: incidentId },
    data: { status, assignedToId, resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null },
  });
}

export async function listCameras() {
  return prisma.cCTVCamera.findMany({ include: { zone: true } });
}

export async function listPatrolLogs() {
  return prisma.patrolLog.findMany({
    include: { officer: { select: { name: true } }, zone: true },
    orderBy: { checkpointAt: 'desc' },
    take: 50,
  });
}

export async function createPatrolLog(officerId: string, input: { zoneId: string; notes?: string }) {
  return prisma.patrolLog.create({ data: { officerId, ...input } });
}

export async function createBroadcast(senderId: string, input: { message: string; severity: IncidentSeverity; audienceRoles: Role[] }) {
  const broadcast = await prisma.emergencyBroadcast.create({ data: { senderId, ...input } });

  const recipients = await prisma.user.findMany({
    where: input.audienceRoles.length ? { role: { in: input.audienceRoles } } : {},
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      title: `Broadcast: ${input.severity}`,
      body: input.message,
      type: 'EMERGENCY' as const,
    })),
  });

  emitToAll(SOCKET_EVENTS.ALERT_NEW, {
    id: broadcast.id,
    type: 'BROADCAST',
    message: input.message,
    severity: input.severity,
    createdAt: broadcast.createdAt,
  });

  return { ...broadcast, recipientCount: recipients.length };
}

export async function listBroadcasts() {
  return prisma.emergencyBroadcast.findMany({
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
