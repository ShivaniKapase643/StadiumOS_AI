import type { Role } from '@/types';
import {
  LayoutDashboard,
  Map,
  Trophy,
  Ticket,
  ScanLine,
  TicketCheck,
  Gauge,
  Activity,
  ParkingSquare,
  Sparkles,
  Store,
  ShieldCheck,
  Siren,
  Wrench,
  Leaf,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  roles: Role[] | 'all';
}

const ALL_ROLES: Role[] = [
  'SUPER_ADMIN',
  'STADIUM_ADMIN',
  'TOURNAMENT_ORGANIZER',
  'SECURITY_OFFICER',
  'MEDICAL_TEAM',
  'MAINTENANCE_TEAM',
  'VENDOR',
  'VOLUNTEER',
  'REFEREE',
  'FAN',
];

const OPS_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN', 'SECURITY_OFFICER', 'VOLUNTEER', 'TOURNAMENT_ORGANIZER'];
const SECURITY_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN', 'SECURITY_OFFICER'];
const EMERGENCY_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN', 'SECURITY_OFFICER', 'MEDICAL_TEAM'];
const MAINTENANCE_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN', 'MAINTENANCE_TEAM'];
const VENDOR_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN', 'VENDOR'];
const REPORT_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN', 'TOURNAMENT_ORGANIZER', 'SECURITY_OFFICER'];
const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN'];

export const NAV_ITEMS: NavItem[] = [
  { label: 'Command Center', path: '/command-center', icon: Gauge, roles: OPS_ROLES },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: 'all' },
  { label: 'Digital Twin', path: '/digital-twin', icon: Map, roles: 'all' },
  { label: 'Tournaments', path: '/tournaments', icon: Trophy, roles: 'all' },
  { label: 'Ticketing', path: '/ticketing', icon: Ticket, roles: 'all' },
  { label: 'My Tickets', path: '/ticketing/my-tickets', icon: TicketCheck, roles: 'all' },
  { label: 'Ticket Scanner', path: '/ticketing/scanner', icon: ScanLine, roles: ['SUPER_ADMIN', 'STADIUM_ADMIN', 'SECURITY_OFFICER', 'VOLUNTEER'] },
  { label: 'Crowd Intelligence', path: '/crowd-intelligence', icon: Activity, roles: OPS_ROLES },
  { label: 'Smart Parking', path: '/parking', icon: ParkingSquare, roles: 'all' },
  { label: 'Fan Experience', path: '/fan-experience', icon: Sparkles, roles: 'all' },
  { label: 'Vendor Management', path: '/vendor', icon: Store, roles: VENDOR_ROLES },
  { label: 'Security Center', path: '/security', icon: ShieldCheck, roles: SECURITY_ROLES },
  { label: 'Emergency Response', path: '/emergency', icon: Siren, roles: EMERGENCY_ROLES },
  { label: 'Asset & Maintenance', path: '/maintenance', icon: Wrench, roles: MAINTENANCE_ROLES },
  { label: 'Sustainability', path: '/sustainability', icon: Leaf, roles: 'all' },
  { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: REPORT_ROLES },
  { label: 'Notifications', path: '/notifications', icon: Bell, roles: 'all' },
  { label: 'Settings', path: '/settings', icon: SettingsIcon, roles: ADMIN_ROLES },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles === 'all' || item.roles.includes(role));
}

export const MANAGE_TOURNAMENT_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN', 'TOURNAMENT_ORGANIZER'];
export const SCORE_MATCH_ROLES: Role[] = [...MANAGE_TOURNAMENT_ROLES, 'REFEREE'];
export const SCAN_TICKET_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN', 'SECURITY_OFFICER', 'VOLUNTEER'];
export const MANAGE_STADIUM_ROLES: Role[] = ['SUPER_ADMIN', 'STADIUM_ADMIN'];

export { ALL_ROLES, OPS_ROLES, SECURITY_ROLES, EMERGENCY_ROLES, MAINTENANCE_ROLES, VENDOR_ROLES, REPORT_ROLES, ADMIN_ROLES };
