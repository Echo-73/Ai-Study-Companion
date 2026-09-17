import { prisma } from '../config/prisma';
import { AIUsageLog, AIEvaluation } from '@prisma/client';

export class AIUsageRepository {
  async logUsage(data: {
    userId?: string;
    projectId?: string;
    feature: string;
    model: string;
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
    estimatedCost?: number;
    success?: boolean;
    retrievalCount?: number;
    retrievedSources?: any;
    errorMessage?: string;
  }): Promise<AIUsageLog> {
    return prisma.aIUsageLog.create({
      data: {
        userId: data.userId || null,
        projectId: data.projectId || null,
        feature: data.feature,
        model: data.model,
        latencyMs: data.latencyMs,
        promptTokens: data.promptTokens || 0,
        completionTokens: data.completionTokens || 0,
        estimatedCost: data.estimatedCost || 0.0,
        success: data.success !== undefined ? data.success : true,
        retrievalCount: data.retrievalCount || 0,
        retrievedSources: data.retrievedSources || null,
        errorMessage: data.errorMessage || null,
      },
    });
  }

  async logEvaluation(data: {
    userId?: string;
    feature: string;
    groundednessScore: number;
    relevanceScore: number;
    citationAccuracy: number;
    unsupportedHandled: boolean;
    notes?: string;
  }): Promise<AIEvaluation> {
    return prisma.aIEvaluation.create({
      data: {
        userId: data.userId || null,
        feature: data.feature,
        groundednessScore: data.groundednessScore,
        relevanceScore: data.relevanceScore,
        citationAccuracy: data.citationAccuracy,
        unsupportedHandled: data.unsupportedHandled,
        notes: data.notes || null,
      },
    });
  }

  async getLogsByProjectId(projectId: string): Promise<AIUsageLog[]> {
    return prisma.aIUsageLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getAllLogs(limit: number = 100): Promise<AIUsageLog[]> {
    return prisma.aIUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const aiUsageRepository = new AIUsageRepository();
