import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../app';
import { prisma } from '../../config/db';
import { createTestUserWithToken, deleteTestUser } from '../../test-helpers/testAuth';

const app = createApp();

describe('Parking API (integration)', () => {
  const createdUserIds: string[] = [];
  let stadiumId: string;
  let lotId: string;
  let slotId: string;

  beforeAll(async () => {
    const stadium = await prisma.stadium.create({ data: { name: `Integration Test Stadium ${Date.now()}`, capacity: 1000 } });
    stadiumId = stadium.id;
    const lot = await prisma.parkingLot.create({ data: { stadiumId, name: 'Test Lot A', totalSlots: 1 } });
    lotId = lot.id;
    const slot = await prisma.parkingSlot.create({ data: { lotId, code: 'A1' } });
    slotId = slot.id;
  });

  afterAll(async () => {
    // ParkingReservation -> ParkingSlot is a RESTRICT relation (reservation
    // history shouldn't silently vanish if a slot/stadium is ever removed in
    // production), so test cleanup has to delete bottom-up explicitly rather
    // than relying on cascade from the Stadium delete.
    await prisma.parkingReservation.deleteMany({ where: { slot: { lotId } } });
    await prisma.stadium.delete({ where: { id: stadiumId } });
    for (const id of createdUserIds) await deleteTestUser(id);
    await prisma.$disconnect();
  });

  it('reserves an available slot and marks it RESERVED', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app)
      .post('/api/parking/reservations')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ slotId, vehicleNumber: 'TEST-1234', startTime: new Date().toISOString() });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');

    const slot = await prisma.parkingSlot.findUnique({ where: { id: slotId } });
    expect(slot?.status).toBe('RESERVED');
  });

  it('rejects reserving a slot that is already reserved', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app)
      .post('/api/parking/reservations')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ slotId, vehicleNumber: 'TEST-9999', startTime: new Date().toISOString() });

    expect(res.status).toBe(409);
  });

  it('lets the reserving user cancel their own reservation, freeing the slot', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    // A fresh slot so this test doesn't depend on the reservation created above.
    const freshSlot = await prisma.parkingSlot.create({ data: { lotId, code: `A${Date.now()}` } });

    const reserveRes = await request(app)
      .post('/api/parking/reservations')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ slotId: freshSlot.id, vehicleNumber: 'TEST-5555', startTime: new Date().toISOString() });
    const reservationId = reserveRes.body.data.id;

    const cancelRes = await request(app)
      .delete(`/api/parking/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${fan.accessToken}`);
    expect(cancelRes.status).toBe(200);

    const slotAfter = await prisma.parkingSlot.findUnique({ where: { id: freshSlot.id } });
    expect(slotAfter?.status).toBe('AVAILABLE');
  });

  it("rejects cancelling another user's reservation", async () => {
    const owner = await createTestUserWithToken(app, Role.FAN);
    const intruder = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(owner.user.id, intruder.user.id);

    const freshSlot = await prisma.parkingSlot.create({ data: { lotId, code: `B${Date.now()}` } });
    const reserveRes = await request(app)
      .post('/api/parking/reservations')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ slotId: freshSlot.id, vehicleNumber: 'TEST-7777', startTime: new Date().toISOString() });

    const cancelRes = await request(app)
      .delete(`/api/parking/reservations/${reserveRes.body.data.id}`)
      .set('Authorization', `Bearer ${intruder.accessToken}`);

    expect(cancelRes.status).toBe(404);
  });
});
