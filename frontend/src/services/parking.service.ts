import { api } from './api';

export interface ParkingSlotDto {
  id: string;
  lotId: string;
  code: string;
  type: 'STANDARD' | 'EV' | 'VIP' | 'DISABLED';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE';
}

export interface ParkingLotDto {
  id: string;
  name: string;
  totalSlots: number;
  evSlots: number;
  slots: ParkingSlotDto[];
}

export interface ParkingReservation {
  id: string;
  vehicleNumber: string;
  startTime: string;
  endTime?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  slot: ParkingSlotDto & { lot: { name: string } };
}

export async function getLots() {
  const { data } = await api.get<{ data: ParkingLotDto[] }>('/parking/lots');
  return data.data;
}

export async function getAnalytics() {
  const { data } = await api.get<{
    data: Array<{ lotId: string; lotName: string; total: number; occupied: number; reserved: number; available: number; evSlots: number; occupancyPct: number }>;
  }>('/parking/analytics');
  return data.data;
}

export async function getMyReservations() {
  const { data } = await api.get<{ data: ParkingReservation[] }>('/parking/reservations');
  return data.data;
}

export async function createReservation(input: { slotId: string; vehicleNumber: string; startTime: string; endTime?: string }) {
  const { data } = await api.post('/parking/reservations', input);
  return data.data;
}

export async function cancelReservation(id: string) {
  await api.delete(`/parking/reservations/${id}`);
}
