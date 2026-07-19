import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';

export async function listAssets() {
  return prisma.asset.findMany({ include: { equipment: { include: { zone: true } } } });
}

export async function listWorkOrders() {
  return prisma.workOrder.findMany({
    include: { asset: true, assignedTo: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function createWorkOrder(input: {
  assetId: string;
  title: string;
  description?: string;
  priority: WorkOrderPriority;
  assignedToId?: string;
  scheduledAt?: Date;
}) {
  return prisma.workOrder.create({ data: input });
}

export async function updateWorkOrderStatus(id: string, status: WorkOrderStatus) {
  const workOrder = await prisma.workOrder.findUnique({ where: { id } });
  if (!workOrder) throw ApiError.notFound('Work order not found');
  return prisma.workOrder.update({
    where: { id },
    data: { status, completedAt: status === 'COMPLETED' ? new Date() : null },
  });
}

export async function listInspectionReports() {
  return prisma.inspectionReport.findMany({
    include: { asset: true, inspector: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function createInspectionReport(inspectorId: string, input: { assetId: string; findings: string; score: number }) {
  return prisma.inspectionReport.create({ data: { inspectorId, ...input } });
}

/**
 * Recomputes a simple predictive-maintenance risk score from each asset's
 * current health score plus how long it's been since the last inspection —
 * rule-based, consistent with this platform's simulated AI modules.
 */
export async function recomputePredictions() {
  const assets = await prisma.asset.findMany({ include: { inspectionReports: { orderBy: { createdAt: 'desc' }, take: 1 } } });

  const predictions = [];
  for (const asset of assets) {
    const daysSinceInspection = asset.inspectionReports[0]
      ? (Date.now() - new Date(asset.inspectionReports[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)
      : 90;

    const riskScore = Math.max(0, Math.min(100, Math.round((100 - asset.healthScore) * 0.7 + Math.min(daysSinceInspection, 60) * 0.5)));
    const remainingUsefulLifeDays = Math.max(5, Math.round((asset.healthScore / 100) * 720 - daysSinceInspection));
    const recommendation =
      riskScore >= 70
        ? 'Schedule immediate inspection and prepare a replacement part.'
        : riskScore >= 40
          ? 'Schedule inspection within the next maintenance window.'
          : 'No action needed — continue standard maintenance schedule.';

    const prediction = await prisma.maintenancePrediction.create({
      data: { assetId: asset.id, riskScore, remainingUsefulLifeDays, recommendation },
    });
    predictions.push(prediction);
  }
  return predictions;
}

export async function listLatestPredictions() {
  const assets = await prisma.asset.findMany({
    include: { maintenancePredictions: { orderBy: { predictedAt: 'desc' }, take: 1 } },
  });
  return assets
    .filter((a) => a.maintenancePredictions.length > 0)
    .map((a) => ({ asset: { id: a.id, name: a.name, category: a.category }, prediction: a.maintenancePredictions[0] }));
}
