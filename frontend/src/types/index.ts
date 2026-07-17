export type Role =
  | 'SUPER_ADMIN'
  | 'STADIUM_ADMIN'
  | 'TOURNAMENT_ORGANIZER'
  | 'SECURITY_OFFICER'
  | 'MEDICAL_TEAM'
  | 'MAINTENANCE_TEAM'
  | 'VENDOR'
  | 'VOLUNTEER'
  | 'REFEREE'
  | 'FAN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: unknown;
}

export interface Stadium {
  id: string;
  name: string;
  address?: string;
  capacity: number;
  mapImageUrl?: string | null;
  mapWidth: number;
  mapHeight: number;
}

export type ZoneType =
  | 'GATE'
  | 'PARKING'
  | 'MEDICAL'
  | 'FIRE_STATION'
  | 'WASHROOM'
  | 'FOOD_COURT'
  | 'VENDOR_STALL'
  | 'EV_CHARGING'
  | 'EMERGENCY_ROUTE'
  | 'SEATING_BLOCK'
  | 'CCTV';

export type ZoneStatus = 'OPERATIONAL' | 'DEGRADED' | 'CLOSED';
export type DensityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type EquipmentStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export interface StadiumZone {
  id: string;
  stadiumId: string;
  name: string;
  type: ZoneType;
  status: ZoneStatus;
  x: number;
  y: number;
  capacity?: number | null;
  crowdReadings?: Array<{ capacityPct: number; densityLevel: DensityLevel; count: number; recordedAt: string }>;
  equipment?: Array<{ id: string; name: string; status: EquipmentStatus; healthScore: number }>;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName?: string | null;
  group?: string | null;
  players?: Player[];
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber?: number | null;
  position?: string | null;
}

export type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
export type MatchStatus = 'NOT_STARTED' | 'FIRST_HALF' | 'HALFTIME' | 'SECOND_HALF' | 'EXTRA_TIME' | 'FULL_TIME' | 'ABANDONED';

export interface Fixture {
  id: string;
  tournamentId: string;
  round: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  scheduledAt: string;
  status: FixtureStatus;
  match?: { id: string; homeScore: number; awayScore: number; status: MatchStatus } | null;
  zone?: StadiumZone | null;
}

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  teams: Team[];
  fixtures?: Fixture[];
  standings?: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  id: string;
  teamId: string;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export type SeatTier = 'GENERAL' | 'PREMIUM' | 'VIP';
export type PaymentMethod = 'CARD' | 'UPI' | 'NET_BANKING' | 'WALLET';

export interface Seat {
  id: string;
  stadiumId: string;
  section: string;
  row: string;
  number: number;
  tier: SeatTier;
  isBooked?: boolean;
}

export interface TicketType {
  id: string;
  fixtureId: string;
  name: string;
  tier: SeatTier;
  price: number;
  quantity: number;
  sold: number;
}

export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED' | 'REFUNDED';

export interface Ticket {
  id: string;
  bookingId: string;
  matchId: string;
  seatId: string;
  seat: Seat;
  ticketType: TicketType;
  qrCode: string;
  qrDataUrl?: string;
  status: TicketStatus;
  checkedInAt?: string | null;
  createdAt: string;
  match?: { fixture: Fixture };
}

export interface DashboardKpis {
  attendance: { scanned: number; totalIssued: number };
  revenue: { totalCollected: number };
  crowd: { averageCapacityPct: number };
  parking: { totalSlots: number; occupied: number; occupancyPct: number };
  energy: { consumptionKwh: number; solarGenKwh: number };
  security: { openIncidents: number };
  emergency: { openAlerts: number };
  maintenance: { openWorkOrders: number };
  weather: { temperatureC: number; condition: string; windSpeedKmh: number; humidityPct: number } | null;
}
