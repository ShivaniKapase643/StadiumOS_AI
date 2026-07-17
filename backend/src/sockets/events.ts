export const SOCKET_EVENTS = {
  CROWD_UPDATE: 'crowd:update',
  ZONE_STATUS_UPDATE: 'zone:status-update',
  PARKING_UPDATE: 'parking:update',
  EQUIPMENT_UPDATE: 'equipment:update',
  ALERT_NEW: 'alert:new',
  DASHBOARD_KPI_UPDATE: 'dashboard:kpi-update',
  MATCH_SCORE_UPDATE: 'match:score-update',
  TICKET_SCANNED: 'ticket:scanned',
  NOTIFICATION_NEW: 'notification:new',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
