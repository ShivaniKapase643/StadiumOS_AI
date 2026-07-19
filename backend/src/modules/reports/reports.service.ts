import { prisma } from '../../config/db';
import { getParkingAnalytics } from '../parking/parking.service';
import { listLatestPredictions } from '../maintenance/maintenance.service';
import { generateInsights } from '../ai/insights.service';
import { getStadiumHealthScore } from '../dashboard/healthScore.service';

export type ReportType = 'attendance' | 'revenue' | 'crowd' | 'security' | 'vendor' | 'parking' | 'maintenance';

async function attendanceReport() {
  const fixtures = await prisma.fixture.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
      match: { include: { tickets: true } },
    },
    orderBy: { scheduledAt: 'desc' },
    take: 50,
  });

  return fixtures.map((f) => ({
    fixture: `${f.homeTeam.name} vs ${f.awayTeam.name}`,
    scheduledAt: f.scheduledAt,
    ticketsIssued: f.match?.tickets.length ?? 0,
    ticketsScanned: f.match?.tickets.filter((t) => t.status === 'USED').length ?? 0,
  }));
}

async function revenueReport() {
  const payments = await prisma.payment.findMany({
    where: { status: 'SUCCESS' },
    include: { booking: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return payments.map((p) => ({
    transactionRef: p.transactionRef,
    customer: p.booking.user.name,
    amount: Number(p.amount),
    method: p.method,
    date: p.createdAt,
  }));
}

async function crowdReport() {
  const zones = await prisma.stadiumZone.findMany({
    include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 20 } },
  });

  return zones
    .filter((z) => z.crowdReadings.length > 0)
    .map((z) => ({
      zone: z.name,
      type: z.type,
      latestCapacityPct: z.crowdReadings[0].capacityPct,
      averageCapacityPct: Math.round((z.crowdReadings.reduce((s, r) => s + r.capacityPct, 0) / z.crowdReadings.length) * 10) / 10,
    }));
}

async function securityReport() {
  const incidents = await prisma.incident.findMany({
    include: { zone: true, reportedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return incidents.map((i) => ({
    type: i.type,
    severity: i.severity,
    status: i.status,
    zone: i.zone?.name ?? '—',
    reportedBy: i.reportedBy.name,
    createdAt: i.createdAt,
  }));
}

async function vendorReport() {
  const vendors = await prisma.vendor.findMany({ include: { orders: true, owner: { select: { name: true } } } });
  return vendors.map((v) => ({
    vendor: v.name,
    owner: v.owner.name,
    category: v.category,
    totalOrders: v.orders.length,
    totalRevenue: v.orders.reduce((s, o) => s + Number(o.totalAmount), 0),
  }));
}

async function maintenanceReport() {
  const predictions = await listLatestPredictions();
  return predictions.map((p) => ({
    asset: p.asset.name,
    category: p.asset.category,
    riskScore: p.prediction.riskScore,
    remainingUsefulLifeDays: p.prediction.remainingUsefulLifeDays,
    recommendation: p.prediction.recommendation,
  }));
}

export async function getReport(type: ReportType) {
  switch (type) {
    case 'attendance':
      return attendanceReport();
    case 'revenue':
      return revenueReport();
    case 'crowd':
      return crowdReport();
    case 'security':
      return securityReport();
    case 'vendor':
      return vendorReport();
    case 'parking':
      return getParkingAnalytics();
    case 'maintenance':
      return maintenanceReport();
  }
}

/**
 * AI Report Generator — combines every existing per-type report plus the
 * rule-based insights engine and the aggregate health score into one
 * payload. Each section reuses the exact same query functions the
 * individual Reports tabs already call, so this can't drift out of sync
 * with them; it's a single consolidated view, not a separate data path.
 */
export async function getFullEventReport() {
  const [attendance, revenue, crowd, security, vendor, parking, maintenance, insights, health] = await Promise.all([
    attendanceReport(),
    revenueReport(),
    crowdReport(),
    securityReport(),
    vendorReport(),
    getParkingAnalytics(),
    maintenanceReport(),
    generateInsights(),
    getStadiumHealthScore(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    health,
    sections: { attendance, revenue, crowd, security, vendor, parking, maintenance },
    aiInsights: insights,
  };
}
