import { PrismaClient, Role, ZoneType, SeatTier, WeatherCondition, AssetStatus, WorkOrderStatus, WorkOrderPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

async function hashedPassword() {
  return bcrypt.hash(DEMO_PASSWORD, 12);
}

async function main() {
  console.log('Seeding Smart Stadium OS demo data...');

  // -------------------------------------------------------------------
  // Organization + demo users (one per role)
  // -------------------------------------------------------------------
  const org = await prisma.organization.create({
    data: { name: 'Smart Stadium Corp' },
  });

  const passwordHash = await hashedPassword();
  const roleEmails: Array<{ role: Role; email: string; name: string }> = [
    { role: Role.SUPER_ADMIN, email: 'superadmin@stadiumos.dev', name: 'Ava Superadmin' },
    { role: Role.STADIUM_ADMIN, email: 'stadiumadmin@stadiumos.dev', name: 'Ben Stadium' },
    { role: Role.TOURNAMENT_ORGANIZER, email: 'organizer@stadiumos.dev', name: 'Carla Organizer' },
    { role: Role.SECURITY_OFFICER, email: 'security@stadiumos.dev', name: 'Dan Security' },
    { role: Role.MEDICAL_TEAM, email: 'medical@stadiumos.dev', name: 'Eva Medic' },
    { role: Role.MAINTENANCE_TEAM, email: 'maintenance@stadiumos.dev', name: 'Finn Maintenance' },
    { role: Role.VENDOR, email: 'vendor@stadiumos.dev', name: 'Grace Vendor' },
    { role: Role.VOLUNTEER, email: 'volunteer@stadiumos.dev', name: 'Hugo Volunteer' },
    { role: Role.REFEREE, email: 'referee@stadiumos.dev', name: 'Ivy Referee' },
    { role: Role.FAN, email: 'fan@stadiumos.dev', name: 'Jai Fan' },
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of roleEmails) {
    const user = await prisma.user.create({
      data: { ...u, passwordHash, organizationId: org.id, isActive: true },
    });
    users[u.role] = user;
  }
  console.log(`Created ${roleEmails.length} demo users (password: ${DEMO_PASSWORD})`);

  // -------------------------------------------------------------------
  // Stadium + schematic zone layout (coordinates on a 1000x700 map)
  // -------------------------------------------------------------------
  const stadium = await prisma.stadium.create({
    data: {
      name: 'National Arena',
      address: '1 Stadium Way, Metro City',
      capacity: 60000,
      mapWidth: 1000,
      mapHeight: 700,
      organizationId: org.id,
    },
  });

  const seatingBlocks = [
    { name: 'North Stand', x: 500, y: 100, capacity: 15000 },
    { name: 'South Stand', x: 500, y: 600, capacity: 15000 },
    { name: 'East Stand Lower', x: 850, y: 250, capacity: 7500 },
    { name: 'East Stand Upper', x: 900, y: 450, capacity: 7500 },
    { name: 'West Stand Lower', x: 150, y: 250, capacity: 7500 },
    { name: 'West Stand Upper', x: 100, y: 450, capacity: 7500 },
    { name: 'North-East Corner', x: 750, y: 130, capacity: 3000 },
    { name: 'South-West Corner', x: 250, y: 570, capacity: 3000 },
  ];

  const gates = [
    { name: 'Gate A (North)', x: 500, y: 40 },
    { name: 'Gate B (South)', x: 500, y: 660 },
    { name: 'Gate C (East)', x: 960, y: 350 },
    { name: 'Gate D (West)', x: 40, y: 350 },
  ];

  const zoneDefs: Array<{ name: string; type: ZoneType; x: number; y: number; capacity?: number }> = [
    ...seatingBlocks.map((b) => ({ ...b, type: ZoneType.SEATING_BLOCK })),
    ...gates.map((g) => ({ ...g, type: ZoneType.GATE, capacity: 5000 })),
    { name: 'Medical Room 1', type: ZoneType.MEDICAL, x: 420, y: 350, capacity: 20 },
    { name: 'Medical Room 2', type: ZoneType.MEDICAL, x: 580, y: 350, capacity: 20 },
    { name: 'Fire Station North', type: ZoneType.FIRE_STATION, x: 460, y: 150 },
    { name: 'Fire Station South', type: ZoneType.FIRE_STATION, x: 540, y: 550 },
    { name: 'Washroom A', type: ZoneType.WASHROOM, x: 350, y: 200 },
    { name: 'Washroom B', type: ZoneType.WASHROOM, x: 650, y: 200 },
    { name: 'Washroom C', type: ZoneType.WASHROOM, x: 350, y: 500 },
    { name: 'Washroom D', type: ZoneType.WASHROOM, x: 650, y: 500 },
    { name: 'Food Court North', type: ZoneType.FOOD_COURT, x: 500, y: 200, capacity: 800 },
    { name: 'Food Court South', type: ZoneType.FOOD_COURT, x: 500, y: 500, capacity: 800 },
    { name: 'Food Court East', type: ZoneType.FOOD_COURT, x: 800, y: 350, capacity: 500 },
    { name: 'Vendor Stall 1', type: ZoneType.VENDOR_STALL, x: 470, y: 230 },
    { name: 'Vendor Stall 2', type: ZoneType.VENDOR_STALL, x: 530, y: 470 },
    { name: 'Vendor Stall 3', type: ZoneType.VENDOR_STALL, x: 780, y: 320 },
    { name: 'EV Charging North', type: ZoneType.EV_CHARGING, x: 300, y: 60 },
    { name: 'EV Charging South', type: ZoneType.EV_CHARGING, x: 700, y: 640 },
    { name: 'Emergency Route 1', type: ZoneType.EMERGENCY_ROUTE, x: 500, y: 20 },
    { name: 'Emergency Route 2', type: ZoneType.EMERGENCY_ROUTE, x: 500, y: 680 },
    { name: 'CCTV Hub 1', type: ZoneType.CCTV, x: 200, y: 100 },
    { name: 'CCTV Hub 2', type: ZoneType.CCTV, x: 800, y: 600 },
    { name: 'Parking Zone North', type: ZoneType.PARKING, x: 200, y: 30 },
    { name: 'Parking Zone South', type: ZoneType.PARKING, x: 800, y: 670 },
  ];

  const zones = [];
  for (const z of zoneDefs) {
    zones.push(await prisma.stadiumZone.create({ data: { stadiumId: stadium.id, ...z } }));
  }
  const zoneByName = Object.fromEntries(zones.map((z) => [z.name, z]));
  console.log(`Created ${zones.length} stadium zones`);

  // Equipment tied to zones
  const equipmentDefs = [
    { name: 'Floodlight Array A', type: 'LIGHTING', zone: 'North Stand' },
    { name: 'Floodlight Array B', type: 'LIGHTING', zone: 'South Stand' },
    { name: 'Turnstile Bank A', type: 'ACCESS_CONTROL', zone: 'Gate A (North)' },
    { name: 'Turnstile Bank B', type: 'ACCESS_CONTROL', zone: 'Gate B (South)' },
    { name: 'Backup Generator 1', type: 'POWER', zone: 'Fire Station North' },
    { name: 'HVAC Unit East', type: 'HVAC', zone: 'East Stand Lower' },
    { name: 'HVAC Unit West', type: 'HVAC', zone: 'West Stand Lower' },
    { name: 'Scoreboard Display', type: 'DISPLAY', zone: 'North Stand' },
    { name: 'PA System Core', type: 'AUDIO', zone: 'South Stand' },
    { name: 'CCTV Camera Rig 1', type: 'SURVEILLANCE', zone: 'CCTV Hub 1' },
  ];
  const equipmentRecords = [];
  for (const e of equipmentDefs) {
    equipmentRecords.push(
      await prisma.equipment.create({
        data: {
          name: e.name,
          type: e.type,
          zoneId: zoneByName[e.zone].id,
          healthScore: 70 + Math.random() * 30,
        },
      })
    );
  }

  // Assets + work orders + inspections + predictive maintenance (feeds Dashboard + future Phase 2 UI)
  for (const eq of equipmentRecords.slice(0, 6)) {
    const asset = await prisma.asset.create({
      data: {
        name: eq.name,
        category: eq.type,
        equipmentId: eq.id,
        status: AssetStatus.ACTIVE,
        healthScore: eq.healthScore,
      },
    });
    await prisma.workOrder.create({
      data: {
        assetId: asset.id,
        title: `Routine inspection — ${eq.name}`,
        priority: WorkOrderPriority.MEDIUM,
        status: WorkOrderStatus.OPEN,
        assignedToId: users[Role.MAINTENANCE_TEAM].id,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.inspectionReport.create({
      data: {
        assetId: asset.id,
        inspectorId: users[Role.MAINTENANCE_TEAM].id,
        findings: 'No critical issues found during routine inspection.',
        score: 80 + Math.random() * 15,
      },
    });
    await prisma.maintenancePrediction.create({
      data: {
        assetId: asset.id,
        riskScore: Math.round(Math.random() * 40),
        remainingUsefulLifeDays: 200 + Math.round(Math.random() * 500),
        recommendation: 'Continue standard maintenance schedule; no immediate action required.',
      },
    });
  }

  // -------------------------------------------------------------------
  // Parking lots + slots
  // -------------------------------------------------------------------
  for (const [lotName, slotCount, evCount] of [
    ['North Parking Lot', 40, 6],
    ['South Parking Lot', 40, 6],
  ] as const) {
    const lot = await prisma.parkingLot.create({
      data: { stadiumId: stadium.id, name: lotName, totalSlots: slotCount, evSlots: evCount },
    });
    const slotsData = Array.from({ length: slotCount }, (_, i) => ({
      lotId: lot.id,
      code: `${lotName[0]}${i + 1}`,
      type: i < evCount ? ('EV' as const) : ('STANDARD' as const),
      status: Math.random() > 0.6 ? ('OCCUPIED' as const) : ('AVAILABLE' as const),
    }));
    await prisma.parkingSlot.createMany({ data: slotsData });
  }
  console.log('Created parking lots and slots');

  // -------------------------------------------------------------------
  // Tournament, teams, players, referee, fixtures (round-robin), matches
  // -------------------------------------------------------------------
  const referee = await prisma.referee.create({
    data: { userId: users[Role.REFEREE].id, certificationLevel: 'FIFA Level 1' },
  });

  const tournament = await prisma.tournament.create({
    data: {
      name: 'Champions Cup 2026',
      sport: 'Football',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stadiumId: stadium.id,
      organizerId: users[Role.TOURNAMENT_ORGANIZER].id,
    },
  });

  const teamNames = ['Metro Lions', 'River Eagles', 'Coastal Sharks', 'Highland Wolves', 'Delta Falcons', 'Summit Bears'];
  const teams = [];
  for (const name of teamNames) {
    const team = await prisma.team.create({
      data: { tournamentId: tournament.id, name, shortName: name.slice(0, 3).toUpperCase() },
    });
    teams.push(team);
    await prisma.leaderboardEntry.create({ data: { tournamentId: tournament.id, teamId: team.id } });

    for (let i = 1; i <= 5; i++) {
      await prisma.player.create({
        data: { teamId: team.id, name: `${name} Player ${i}`, jerseyNumber: i, position: 'Midfielder' },
      });
    }
  }
  console.log(`Created tournament "${tournament.name}" with ${teams.length} teams`);

  // Round-robin schedule (single circle) generated inline to avoid a runtime
  // dependency between the seed script and the Express app.
  const seatingZoneIds = zones.filter((z) => z.type === ZoneType.SEATING_BLOCK).map((z) => z.id);
  const teamIds = teams.map((t) => t.id);
  const roundsCount = teamIds.length - 1;
  let rotation = [...teamIds];
  const fixtures = [];
  for (let round = 0; round < roundsCount; round++) {
    const half = rotation.length / 2;
    for (let i = 0; i < half; i++) {
      const homeTeamId = rotation[i];
      const awayTeamId = rotation[rotation.length - 1 - i];
      const scheduledAt = new Date(Date.now() + round * 7 * 24 * 60 * 60 * 1000 + i * 3 * 60 * 60 * 1000);
      const fixture = await prisma.fixture.create({
        data: {
          tournamentId: tournament.id,
          round: `Round ${round + 1}`,
          homeTeamId,
          awayTeamId,
          scheduledAt,
          refereeId: referee.id,
          zoneId: seatingZoneIds[fixtures.length % seatingZoneIds.length],
        },
      });
      fixtures.push(fixture);
    }
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
  }
  console.log(`Generated ${fixtures.length} fixtures via round-robin`);

  // Play out the first fixture as a completed match so the leaderboard has data.
  const firstFixture = fixtures[0];
  await prisma.match.create({
    data: { fixtureId: firstFixture.id, homeScore: 2, awayScore: 1, status: 'FULL_TIME', startedAt: new Date(), endedAt: new Date() },
  });
  await prisma.fixture.update({ where: { id: firstFixture.id }, data: { status: 'COMPLETED' } });
  await prisma.leaderboardEntry.update({
    where: { teamId: firstFixture.homeTeamId },
    data: { played: 1, won: 1, goalsFor: 2, goalsAgainst: 1, points: 3 },
  });
  await prisma.leaderboardEntry.update({
    where: { teamId: firstFixture.awayTeamId },
    data: { played: 1, lost: 1, goalsFor: 1, goalsAgainst: 2, points: 0 },
  });

  // -------------------------------------------------------------------
  // Seats + ticket types for the next upcoming fixture
  // -------------------------------------------------------------------
  const upcomingFixture = fixtures[1];
  const sections: Array<[string, SeatTier, number, number]> = [
    ['A', SeatTier.GENERAL, 10, 20],
    ['B', SeatTier.PREMIUM, 6, 12],
    ['C', SeatTier.VIP, 4, 8],
  ];
  for (const [section, tier, rows, seatsPerRow] of sections) {
    const rowsLetters = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
    await prisma.seat.createMany({
      data: rowsLetters.flatMap((row) =>
        Array.from({ length: seatsPerRow }, (_, i) => ({
          stadiumId: stadium.id,
          section,
          row,
          number: i + 1,
          tier,
        }))
      ),
      skipDuplicates: true,
    });
  }

  await prisma.ticketType.createMany({
    data: [
      { fixtureId: upcomingFixture.id, name: 'General Admission', tier: SeatTier.GENERAL, price: 25, quantity: 200 },
      { fixtureId: upcomingFixture.id, name: 'Premium', tier: SeatTier.PREMIUM, price: 75, quantity: 72 },
      { fixtureId: upcomingFixture.id, name: 'VIP', tier: SeatTier.VIP, price: 200, quantity: 32 },
    ],
  });
  console.log('Created seats and ticket types for the next fixture');

  // -------------------------------------------------------------------
  // Baseline crowd / energy / sustainability / weather data
  // -------------------------------------------------------------------
  for (const zone of zones.filter((z) => ['SEATING_BLOCK', 'GATE', 'FOOD_COURT'].includes(z.type))) {
    const pct = 20 + Math.random() * 40;
    await prisma.crowdDensityReading.create({
      data: {
        zoneId: zone.id,
        count: Math.round(((zone.capacity ?? 500) * pct) / 100),
        capacityPct: pct,
        densityLevel: pct > 70 ? 'HIGH' : pct > 40 ? 'MODERATE' : 'LOW',
      },
    });
  }

  await prisma.energyReading.create({ data: { stadiumId: stadium.id, consumptionKwh: 4200, solarGenKwh: 850 } });
  await prisma.waterUsageReading.create({ data: { stadiumId: stadium.id, usageLiters: 18500 } });
  await prisma.wasteRecord.create({ data: { stadiumId: stadium.id, category: 'Recyclables', weightKg: 320, recycled: true } });
  await prisma.wasteRecord.create({ data: { stadiumId: stadium.id, category: 'General', weightKg: 540, recycled: false } });
  await prisma.carbonFootprintRecord.create({ data: { stadiumId: stadium.id, co2eKg: 2100 } });
  await prisma.weatherSnapshot.create({
    data: { stadiumId: stadium.id, temperatureC: 24, condition: WeatherCondition.CLEAR, windSpeedKmh: 12, humidityPct: 55 },
  });

  // -------------------------------------------------------------------
  // Security / vendor / fan-experience baseline data
  // -------------------------------------------------------------------
  await prisma.incident.create({
    data: {
      reportedById: users[Role.SECURITY_OFFICER].id,
      zoneId: zoneByName['Gate C (East)'].id,
      type: 'Overcrowding at gate',
      severity: 'MEDIUM',
      description: 'Temporary queue buildup, resolved by opening an additional lane.',
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  });

  const vendor = await prisma.vendor.create({
    data: { ownerId: users[Role.VENDOR].id, name: 'Grace\'s Grill', category: 'Food & Beverage', zoneId: zoneByName['Vendor Stall 1'].id },
  });
  await prisma.inventoryItem.createMany({
    data: [
      { vendorId: vendor.id, name: 'Grilled Burger', sku: 'FB-001', stock: 150, price: 8.5 },
      { vendorId: vendor.id, name: 'Loaded Nachos', sku: 'FB-002', stock: 120, price: 7.0 },
      { vendorId: vendor.id, name: 'Stadium Hot Dog', sku: 'FB-003', stock: 200, price: 6.5 },
      { vendorId: vendor.id, name: 'Margherita Pizza Slice', sku: 'FB-004', stock: 100, price: 6.0 },
      { vendorId: vendor.id, name: 'Chicken Wrap', sku: 'FB-005', stock: 90, price: 8.0 },
      { vendorId: vendor.id, name: 'Garden Salad', sku: 'FB-006', stock: 60, price: 5.5 },
      { vendorId: vendor.id, name: 'Soft Drink', sku: 'FB-007', stock: 300, price: 3.5 },
      { vendorId: vendor.id, name: 'Bottled Water', sku: 'FB-008', stock: 400, price: 2.5 },
      { vendorId: vendor.id, name: 'Craft Lemonade', sku: 'FB-009', stock: 150, price: 4.5 },
      { vendorId: vendor.id, name: 'Soft-Serve Ice Cream', sku: 'FB-010', stock: 80, price: 5.0 },
    ],
  });

  await prisma.notification.create({
    data: { userId: users[Role.FAN].id, title: 'Welcome to Smart Stadium OS', body: 'Explore live matches, book tickets, and more.', type: 'GENERAL' },
  });

  // -------------------------------------------------------------------
  // Security Center / Emergency Response baseline data
  // -------------------------------------------------------------------
  await prisma.cCTVCamera.createMany({
    data: [
      { zoneId: zoneByName['CCTV Hub 1'].id, label: 'North Perimeter Cam', status: 'ONLINE' },
      { zoneId: zoneByName['CCTV Hub 1'].id, label: 'North Concourse Cam', status: 'ONLINE' },
      { zoneId: zoneByName['CCTV Hub 2'].id, label: 'South Perimeter Cam', status: 'ONLINE' },
      { zoneId: zoneByName['Gate A (North)'].id, label: 'Gate A Entry Cam', status: 'ONLINE' },
    ],
  });

  await prisma.patrolLog.createMany({
    data: [
      { officerId: users[Role.SECURITY_OFFICER].id, zoneId: zoneByName['Gate A (North)'].id, notes: 'Routine checkpoint, all clear.' },
      { officerId: users[Role.SECURITY_OFFICER].id, zoneId: zoneByName['Food Court North'].id, notes: 'Crowd flow normal.' },
    ],
  });

  await prisma.evacuationPlan.create({
    data: {
      stadiumId: stadium.id,
      name: 'Primary North-South Evacuation Route',
      status: 'ACTIVE',
      routeData: {
        routes: [
          { from: 'North Stand', via: ['Gate A (North)'], to: 'Emergency Route 1' },
          { from: 'South Stand', via: ['Gate B (South)'], to: 'Emergency Route 2' },
        ],
      },
    },
  });

  await prisma.sOSAlert.create({
    data: {
      userId: users[Role.FAN].id,
      zoneId: zoneByName['South Stand'].id,
      type: 'MEDICAL',
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: users[Role.SUPER_ADMIN].id, action: 'SEED_INIT', entityType: 'System', metadata: { note: 'Initial demo data seeded' } },
      { userId: users[Role.TOURNAMENT_ORGANIZER].id, action: 'CREATE_TOURNAMENT', entityType: 'Tournament', entityId: tournament.id },
    ],
  });

  console.log('Seed complete.');
  console.log('\nDemo login credentials (all roles share the same password):');
  console.log(`  Password: ${DEMO_PASSWORD}`);
  roleEmails.forEach((u) => console.log(`  ${u.role.padEnd(22)} ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
