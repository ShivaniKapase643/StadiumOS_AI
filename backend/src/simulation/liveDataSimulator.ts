import { DensityLevel, EquipmentStatus, ParkingSlotStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { emitToAll } from '../sockets';
import { SOCKET_EVENTS } from '../sockets/events';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { demoTickMatchSimulation } from '../modules/tournaments/tournament.service';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function densityLevelFor(pct: number): DensityLevel {
  if (pct >= 90) return DensityLevel.CRITICAL;
  if (pct >= 70) return DensityLevel.HIGH;
  if (pct >= 40) return DensityLevel.MODERATE;
  return DensityLevel.LOW;
}

function randomWalk(current: number, volatility: number, min: number, max: number): number {
  const delta = (Math.random() - 0.5) * 2 * volatility;
  return clamp(current + delta, min, max);
}

/**
 * Drives the "digital twin" illusion: walks crowd density, parking occupancy
 * and equipment health on an interval and broadcasts deltas over Socket.IO,
 * so the Dashboard and Digital Twin update live without polling.
 */
export function startLiveDataSimulator(): NodeJS.Timeout {
  logger.info(`Live data simulator starting (interval=${env.simulatorIntervalMs}ms)`);

  let tickCount = 0;

  return setInterval(async () => {
    tickCount++;
    try {
      await tickCrowdDensity();
      await tickParking();
      await tickEquipment();
      await maybeRaiseAlert();
      if (tickCount % 3 === 0) {
        await demoTickMatchSimulation().catch((err) => logger.error('Demo match tick failed', { error: err }));
      }
    } catch (err) {
      logger.error('Live data simulator tick failed', { error: err });
    }
  }, env.simulatorIntervalMs);
}

async function tickCrowdDensity() {
  const zones = await prisma.stadiumZone.findMany({
    where: { type: { in: ['SEATING_BLOCK', 'GATE', 'FOOD_COURT'] } },
    include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
  });

  const updates = [];
  for (const zone of zones) {
    const capacity = zone.capacity ?? 500;
    const lastPct = zone.crowdReadings[0]?.capacityPct ?? 30 + Math.random() * 20;
    const pct = randomWalk(lastPct, 8, 5, 100);
    const count = Math.round((pct / 100) * capacity);
    const densityLevel = densityLevelFor(pct);

    const reading = await prisma.crowdDensityReading.create({
      data: { zoneId: zone.id, count, capacityPct: pct, densityLevel },
    });

    updates.push({ zoneId: zone.id, zoneName: zone.name, count, capacityPct: pct, densityLevel, recordedAt: reading.recordedAt });
  }

  if (updates.length) emitToAll(SOCKET_EVENTS.CROWD_UPDATE, updates);
}

async function tickParking() {
  const slots = await prisma.parkingSlot.findMany({ take: 60 });
  const updates = [];

  for (const slot of slots) {
    if (Math.random() > 0.15) continue; // only a subset flips state each tick
    const nextStatus =
      slot.status === ParkingSlotStatus.AVAILABLE ? ParkingSlotStatus.OCCUPIED : ParkingSlotStatus.AVAILABLE;

    if (slot.status === ParkingSlotStatus.OUT_OF_SERVICE || slot.status === ParkingSlotStatus.RESERVED) continue;

    await prisma.parkingSlot.update({ where: { id: slot.id }, data: { status: nextStatus } });
    updates.push({ slotId: slot.id, lotId: slot.lotId, status: nextStatus });
  }

  if (updates.length) emitToAll(SOCKET_EVENTS.PARKING_UPDATE, updates);
}

async function tickEquipment() {
  const equipment = await prisma.equipment.findMany({ take: 40 });
  const updates = [];

  for (const item of equipment) {
    if (Math.random() > 0.2) continue;
    const nextHealth = randomWalk(item.healthScore, 5, 0, 100);
    let status: EquipmentStatus = EquipmentStatus.HEALTHY;
    if (nextHealth < 30) status = EquipmentStatus.CRITICAL;
    else if (nextHealth < 60) status = EquipmentStatus.WARNING;

    await prisma.equipment.update({
      where: { id: item.id },
      data: { healthScore: nextHealth, status },
    });

    updates.push({ equipmentId: item.id, zoneId: item.zoneId, healthScore: nextHealth, status });
  }

  if (updates.length) emitToAll(SOCKET_EVENTS.EQUIPMENT_UPDATE, updates);
}

async function maybeRaiseAlert() {
  // Rare random medical/security event to keep the Emergency + Security KPIs alive.
  if (Math.random() > 0.05) return;

  const zone = await prisma.stadiumZone.findFirst({
    where: { type: { in: ['SEATING_BLOCK', 'GATE'] } },
    orderBy: { id: 'asc' },
    skip: Math.floor(Math.random() * 5),
  });
  if (!zone) return;

  const anyUser = await prisma.user.findFirst({ where: { role: 'FAN' } });
  if (!anyUser) return;

  const type = Math.random() > 0.5 ? 'MEDICAL' : 'SECURITY';
  const alert = await prisma.sOSAlert.create({
    data: { userId: anyUser.id, zoneId: zone.id, type },
  });

  emitToAll(SOCKET_EVENTS.ALERT_NEW, {
    id: alert.id,
    type: alert.type,
    zoneId: zone.id,
    zoneName: zone.name,
    createdAt: alert.createdAt,
  });
}
