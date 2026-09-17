import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma Error:', e);
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn('Prisma Warning:', e);
});
