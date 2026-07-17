import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { NotificationChannel, NotificationType, Role } from '@prisma/client';
import { emitToAll } from '../../sockets';
import { SOCKET_EVENTS } from '../../sockets/events';

export async function getMyNotifications(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) throw ApiError.notFound('Notification not found');
  return prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function broadcastNotification(input: {
  title: string;
  body: string;
  type: NotificationType;
  channel: NotificationChannel;
  audienceRoles: Role[];
}) {
  const recipients = await prisma.user.findMany({
    where: input.audienceRoles.length ? { role: { in: input.audienceRoles } } : {},
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: recipients.map((r) => ({ userId: r.id, title: input.title, body: input.body, type: input.type, channel: input.channel })),
  });

  await prisma.notificationLog.create({
    data: {
      channel: input.channel,
      recipient: `${recipients.length} users (${input.audienceRoles.join(', ') || 'all roles'})`,
      subject: input.title,
      body: input.body,
      status: 'SENT',
    },
  });

  emitToAll(SOCKET_EVENTS.NOTIFICATION_NEW, { title: input.title, body: input.body });

  return { recipientCount: recipients.length };
}

export async function getNotificationLogs() {
  return prisma.notificationLog.findMany({ orderBy: { sentAt: 'desc' }, take: 100 });
}
