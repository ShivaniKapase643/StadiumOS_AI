import { prisma } from '../../config/db';

export async function getSustainabilitySummary(stadiumId: string) {
  const [energy, water, waste, carbon] = await Promise.all([
    prisma.energyReading.findMany({ where: { stadiumId }, orderBy: { recordedAt: 'desc' }, take: 30 }),
    prisma.waterUsageReading.findMany({ where: { stadiumId }, orderBy: { recordedAt: 'desc' }, take: 30 }),
    prisma.wasteRecord.findMany({ where: { stadiumId }, orderBy: { recordedAt: 'desc' }, take: 30 }),
    prisma.carbonFootprintRecord.findMany({ where: { stadiumId }, orderBy: { recordedAt: 'desc' }, take: 30 }),
  ]);

  const totalWasteKg = waste.reduce((sum, w) => sum + w.weightKg, 0);
  const recycledKg = waste.filter((w) => w.recycled).reduce((sum, w) => sum + w.weightKg, 0);

  return {
    energy: {
      latest: energy[0] ?? null,
      trend: energy.slice().reverse().map((e) => ({ date: e.recordedAt, consumptionKwh: e.consumptionKwh, solarGenKwh: e.solarGenKwh })),
    },
    water: {
      latest: water[0] ?? null,
      trend: water.slice().reverse().map((w) => ({ date: w.recordedAt, usageLiters: w.usageLiters })),
    },
    waste: {
      totalKg: totalWasteKg,
      recycledKg,
      recyclingRatePct: totalWasteKg ? Math.round((recycledKg / totalWasteKg) * 1000) / 10 : 0,
      records: waste,
    },
    carbon: {
      latest: carbon[0] ?? null,
      trend: carbon.slice().reverse().map((c) => ({ date: c.recordedAt, co2eKg: c.co2eKg })),
    },
  };
}
