import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { ParkingSlotStatus, ReservationStatus } from '@prisma/client';

export async function listLots() {
  return prisma.parkingLot.findMany({ include: { slots: true } });
}

export async function createReservation(userId: string, input: { slotId: string; vehicleNumber: string; startTime: Date; endTime?: Date }) {
  const slot = await prisma.parkingSlot.findUnique({ where: { id: input.slotId } });
  if (!slot) throw ApiError.notFound('Parking slot not found');
  if (slot.status !== ParkingSlotStatus.AVAILABLE) throw ApiError.conflict('Slot is not available');

  const [reservation] = await prisma.$transaction([
    prisma.parkingReservation.create({
      data: {
        userId,
        slotId: input.slotId,
        vehicleNumber: input.vehicleNumber,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    }),
    prisma.parkingSlot.update({ where: { id: input.slotId }, data: { status: ParkingSlotStatus.RESERVED } }),
  ]);

  return reservation;
}

export async function getMyReservations(userId: string) {
  return prisma.parkingReservation.findMany({
    where: { userId },
    include: { slot: { include: { lot: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function cancelReservation(userId: string, reservationId: string) {
  const reservation = await prisma.parkingReservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.userId !== userId) throw ApiError.notFound('Reservation not found');
  if (reservation.status !== ReservationStatus.ACTIVE) throw ApiError.badRequest('Reservation is not active');

  await prisma.$transaction([
    prisma.parkingReservation.update({ where: { id: reservationId }, data: { status: ReservationStatus.CANCELLED } }),
    prisma.parkingSlot.update({ where: { id: reservation.slotId }, data: { status: ParkingSlotStatus.AVAILABLE } }),
  ]);
}

export async function getParkingAnalytics() {
  const lots = await prisma.parkingLot.findMany({ include: { slots: true } });
  return lots.map((lot) => {
    const total = lot.slots.length;
    const occupied = lot.slots.filter((s) => s.status === 'OCCUPIED').length;
    const reserved = lot.slots.filter((s) => s.status === 'RESERVED').length;
    const ev = lot.slots.filter((s) => s.type === 'EV').length;
    return {
      lotId: lot.id,
      lotName: lot.name,
      total,
      occupied,
      reserved,
      available: total - occupied - reserved,
      evSlots: ev,
      occupancyPct: total ? Math.round(((occupied + reserved) / total) * 1000) / 10 : 0,
    };
  });
}
