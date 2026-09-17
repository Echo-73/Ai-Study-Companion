import { prisma } from '../config/prisma';
import { LearningEvent } from '@prisma/client';

export class LearningEventRepository {
  async record(data: {
    userId: string;
    projectId: string;
    eventType: string;
    metadata: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<LearningEvent> {
    if (data.idempotencyKey) {
      const existing = await prisma.learningEvent.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) return existing;
    }

    return prisma.learningEvent.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        eventType: data.eventType,
        metadata: data.metadata,
        idempotencyKey: data.idempotencyKey || null,
      },
    });
  }

  async getProjectEvents(projectId: string, limit: number = 20): Promise<LearningEvent[]> {
    return prisma.learningEvent.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getUserEvents(userId: string, limit: number = 20): Promise<LearningEvent[]> {
    return prisma.learningEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

export const learningEventRepository = new LearningEventRepository();
