import { prisma } from '../config/prisma';
import { Recommendation } from '@prisma/client';

export class RecommendationRepository {
  async getProjectRecommendations(projectId: string): Promise<Recommendation[]> {
    return prisma.recommendation.findMany({
      where: { projectId, isDismissed: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRecommendation(data: {
    projectId: string;
    title: string;
    actionText: string;
    reason: string;
    targetType: string;
    targetId?: string;
  }): Promise<Recommendation> {
    return prisma.recommendation.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        actionText: data.actionText,
        reason: data.reason,
        targetType: data.targetType,
        targetId: data.targetId,
      },
    });
  }

  async dismissRecommendation(id: string): Promise<Recommendation> {
    return prisma.recommendation.update({
      where: { id },
      data: { isDismissed: true },
    });
  }
  
  async findById(id: string): Promise<Recommendation | null> {
    return prisma.recommendation.findUnique({ where: { id } });
  }
}

export const recommendationRepository = new RecommendationRepository();
