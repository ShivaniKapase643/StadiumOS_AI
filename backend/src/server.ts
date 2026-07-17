import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initSocketServer } from './sockets';
import { startLiveDataSimulator } from './simulation/liveDataSimulator';
import { prisma } from './config/db';

async function main() {
  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketServer(httpServer);
  startLiveDataSimulator();

  httpServer.listen(env.port, () => {
    logger.info(`Smart Stadium OS API listening on port ${env.port} (${env.nodeEnv})`);
    logger.info(`Swagger docs: http://localhost:${env.port}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal error during startup', { error: err });
  process.exit(1);
});
