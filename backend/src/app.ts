import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import twinRoutes from './modules/stadium-twin/twin.routes';
import tournamentRoutes from './modules/tournaments/tournament.routes';
import ticketingRoutes from './modules/ticketing/ticketing.routes';
import aiRoutes from './modules/ai/ai.routes';
import crowdIntelligenceRoutes from './modules/crowd-intelligence/crowd-intelligence.routes';
import parkingRoutes from './modules/parking/parking.routes';
import fanExperienceRoutes from './modules/fan-experience/fan-experience.routes';
import vendorRoutes from './modules/vendor/vendor.routes';
import securityRoutes from './modules/security/security.routes';
import emergencyRoutes from './modules/emergency/emergency.routes';
import maintenanceRoutes from './modules/maintenance/maintenance.routes';
import sustainabilityRoutes from './modules/sustainability/sustainability.routes';
import reportsRoutes from './modules/reports/reports.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import settingsRoutes from './modules/settings/settings.routes';

export function createApp(): Application {
  const app = express();

  // Render (and most PaaS hosts) sit behind a reverse proxy, so without this
  // Express can't see real client IPs — req.ip resolves to the proxy's
  // address for every visitor, which silently made express-rate-limit bucket
  // all users together under one shared quota.
  if (env.isProd) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Baseline abuse protection for every API route; auth routes additionally
  // layer a stricter limiter (see auth.routes.ts). Limits are much higher
  // outside production: a single dev/demo machine's IP legitimately
  // generates far more traffic (live Socket.IO reconnects, multiple open
  // tabs, rapid manual testing) than a production multi-user deployment
  // would ever see from one address.
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.isProd ? 300 : 5000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/twin', twinRoutes);
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/ticketing', ticketingRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/crowd-intelligence', crowdIntelligenceRoutes);
  app.use('/api/parking', parkingRoutes);
  app.use('/api/fan-experience', fanExperienceRoutes);
  app.use('/api/vendor', vendorRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/emergency', emergencyRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/sustainability', sustainabilityRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
