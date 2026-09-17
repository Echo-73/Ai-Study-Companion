import { prisma } from '../config/prisma';
import { JobStatus, BackgroundJob } from '@prisma/client';
import { logger } from '../config/logger';

export type JobProcessorHandler = (payload: any) => Promise<void>;

export class BackgroundJobService {
  private handlers: Map<string, JobProcessorHandler> = new Map();
  private isProcessing = false;
  private workerTimer: NodeJS.Timeout | null = null;

  registerHandler(type: string, handler: JobProcessorHandler): void {
    this.handlers.set(type, handler);
  }

  startWorker(intervalMs: number = 3000): void {
    if (this.workerTimer) return;
    logger.info(`[BACKGROUND WORKER] Starting job worker (polling every ${intervalMs}ms)`);
    this.processNextJobs().catch((err) => logger.error('[BACKGROUND WORKER] Startup run failed:', err));
    this.workerTimer = setInterval(() => {
      this.processNextJobs().catch((err) => logger.error('[BACKGROUND WORKER] Polling cycle failed:', err));
    }, intervalMs);
  }

  stopWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
      logger.info('[BACKGROUND WORKER] Stopped job worker');
    }
  }

  async enqueueJob(
    type: string,
    payload: any,
    idempotencyKey?: string | null,
    maxAttempts: number = 3
  ): Promise<BackgroundJob> {
    if (idempotencyKey) {
      const existing = await prisma.backgroundJob.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        setImmediate(() => this.processNextJobs());
        return existing;
      }
    }

    const job = await prisma.backgroundJob.create({
      data: {
        type,
        payload,
        idempotencyKey: idempotencyKey || null,
        maxAttempts,
        status: JobStatus.QUEUED,
      },
    });

    setImmediate(() => this.processNextJobs());

    return job;
  }

  async processNextJobs(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const queuedJob = await prisma.backgroundJob.findFirst({
          where: {
            status: { in: [JobStatus.QUEUED, JobStatus.RETRYING] },
          },
          orderBy: [
            { attempts: 'asc' },
            { createdAt: 'asc' },
          ],
        });

        if (!queuedJob) {
          break;
        }

        // Atomic claim: only claim if the job is still in QUEUED or RETRYING status
        const claimResult = await prisma.backgroundJob.updateMany({
          where: {
            id: queuedJob.id,
            status: { in: [JobStatus.QUEUED, JobStatus.RETRYING] },
          },
          data: {
            status: JobStatus.PROCESSING,
            attempts: { increment: 1 },
          },
        });

        // If another process or thread already claimed this job, count is 0. Move to next.
        if (claimResult.count === 0) {
          continue;
        }

        const handler = this.handlers.get(queuedJob.type);
        if (!handler) {
          logger.error(`No handler registered for job type: ${queuedJob.type}`);
          await prisma.backgroundJob.update({
            where: { id: queuedJob.id },
            data: { status: JobStatus.FAILED, errorMessage: `No handler registered for ${queuedJob.type}` },
          });
          continue;
        }

        try {
          await handler(queuedJob.payload);

          await prisma.backgroundJob.update({
            where: { id: queuedJob.id },
            data: { status: JobStatus.COMPLETED, errorMessage: null },
          });
          logger.info(`Job ${queuedJob.id} (${queuedJob.type}) completed successfully.`);
        } catch (err: any) {
          const attempts = queuedJob.attempts + 1;
          const willRetry = attempts < queuedJob.maxAttempts;
          const status = willRetry ? JobStatus.RETRYING : JobStatus.FAILED;

          logger.error(`Job ${queuedJob.id} failed attempt ${attempts}/${queuedJob.maxAttempts}:`, err.message);

          await prisma.backgroundJob.update({
            where: { id: queuedJob.id },
            data: {
              status,
              errorMessage: err.message || 'Unknown processing error',
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error in background job worker loop:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async getJobStatus(jobId: string): Promise<BackgroundJob | null> {
    return prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });
  }

  async getAllJobs(): Promise<BackgroundJob[]> {
    return prisma.backgroundJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

export const backgroundJobService = new BackgroundJobService();
