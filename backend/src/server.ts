import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { backgroundJobService } from './services/backgroundJobService';

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully via Prisma');

    backgroundJobService.startWorker(3000);

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    const shutdown = async () => {
      logger.info('Shutting down server gracefully...');
      backgroundJobService.stopWorker();
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Database disconnected. Process exited cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
