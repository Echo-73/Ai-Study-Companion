import { projectRepository } from '../repositories/projectRepository';
import { learningEventRepository } from '../repositories/learningEventRepository';
import { materialRepository } from '../repositories/materialRepository';
import { analyticsService } from './analyticsService';
import { masteryService } from './masteryService';
import { recommendationService } from './recommendationService';
import { isValidConceptName, normalizeConceptName } from '../utils/conceptValidator';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

export const createProjectSchema = z.object({
  spaceId: z.string().uuid('Invalid spaceId'),
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  learningGoal: z.string().min(3, 'Learning goal is required'),
});

export class ProjectService {
  async getProjectDashboard(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // 1. Fetch real analytics from single source of truth
    const analytics = await analyticsService.getProjectAnalytics(projectId);

    // 2. Fetch real mastery from single source of truth
    const masteryList = await masteryService.getProjectMastery(projectId);
    const validMastery = masteryList.filter((c) => isValidConceptName(c.name));
    const conceptsWithData = validMastery.filter((c) => c.hasData);

    const strongCount = validMastery.filter(
      (c) => c.status === 'IMPROVING' || (c.hasData && c.score >= 0.8)
    ).length;

    const needsAttentionCount = validMastery.filter(
      (c) => c.status === 'REQUIRES_ATTENTION' || (c.hasData && c.score < 0.6)
    ).length;

    const developingCount = validMastery.filter(
      (c) => c.status === 'STABLE' || (c.hasData && c.score >= 0.6 && c.score < 0.8)
    ).length;

    const averageMastery =
      conceptsWithData.length > 0
        ? Math.round(
            (conceptsWithData.reduce((acc, c) => acc + c.score, 0) / conceptsWithData.length) * 100
          )
        : null;

    // 3. Fetch real recommendations
    const recommendations = await recommendationService.getRecommendations(projectId);
    const activeRecommendations = recommendations.filter((r) => !r.isDismissed);
    const topWeakRecommendation =
      activeRecommendations.find((r) => r.title?.startsWith('Focus on')) ||
      activeRecommendations.find((r) => r.actionType === 'TAKE_QUIZ') ||
      activeRecommendations[0] ||
      null;

    // 4. Fetch real materials
    const materials = await materialRepository.findByProjectId(projectId);
    const readyMaterialsCount = materials.filter((m) => m.status === 'READY').length;
    const processingMaterialsCount = materials.filter((m) => m.status === 'PROCESSING').length;
    const failedMaterialsCount = materials.filter((m) => m.status === 'FAILED').length;

    // 5. Fetch recent learning events and format them
    const rawEvents = await learningEventRepository.getProjectEvents(projectId, 8);
    const recentActivity = rawEvents.map((e) => {
      let title = e.eventType.replace(/_/g, ' ');
      let description = 'Activity logged';

      switch (e.eventType) {
        case 'ASSESSMENT_COMPLETED':
          title = 'Quiz Completed';
          const scoreVal = (e.metadata as any)?.overallScore ?? (e.metadata as any)?.score;
          const pct = typeof scoreVal === 'number' ? Math.round(scoreVal * 100) : null;
          description = pct !== null ? `Completed adaptive assessment with ${pct}% score` : 'Assessment submitted';
          break;
        case 'QUIZ_STARTED':
          title = 'Quiz Started';
          const qCount = (e.metadata as any)?.questionCount || 4;
          description = `Adaptive quiz initiated (${qCount} questions)`;
          break;
        case 'TUTOR_INTERACTION':
          title = 'Tutor Interaction';
          description = 'Asked AI Tutor a question grounded in materials';
          break;
        case 'MATERIAL_UPLOADED':
          title = 'Material Uploaded';
          description = (e.metadata as any)?.fileName || 'Document added to project';
          break;
        case 'MATERIAL_PROCESSING_COMPLETED':
          title = 'Material Processed';
          const pages = (e.metadata as any)?.pageCount;
          description = pages ? `${pages} page(s) indexed for search & tutor` : 'Material ready for study';
          break;
        case 'MASTERY_UPDATED':
          title = 'Mastery Updated';
          description = 'Concept mastery updated based on assessment performance';
          break;
        case 'PROJECT_CREATED':
          title = 'Project Created';
          description = `Learning goal: "${project.learningGoal}"`;
          break;
      }

      return {
        id: e.id,
        eventType: e.eventType,
        title,
        description,
        timestamp: e.timestamp.toISOString(),
      };
    });

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        learningGoal: project.learningGoal,
        spaceId: project.spaceId,
        createdAt: project.createdAt.toISOString(),
      },
      materials: {
        total: materials.length,
        readyCount: readyMaterialsCount,
        processingCount: processingMaterialsCount,
        failedCount: failedMaterialsCount,
        list: materials.slice(0, 5).map((m) => ({
          id: m.id,
          title: m.title,
          fileName: m.title,
          status: m.status,
          pageCount: m.pageCount,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      tutor: {
        interactionCount: analytics.tutorQuestions,
      },
      quiz: {
        quizzesTaken: analytics.quizzesTaken,
        averageQuizScore: analytics.averageQuizScore,
        lastQuizScore:
          analytics.recentQuizzes.length > 0
            ? analytics.recentQuizzes[0].scorePercentage ?? Math.round(analytics.recentQuizzes[0].score * 100)
            : null,
        recentQuizzes: analytics.recentQuizzes.slice(0, 5),
      },
      mastery: {
        conceptCount: validMastery.length,
        strongCount,
        needsAttentionCount,
        developingCount,
        averageMastery,
        concepts: validMastery,
      },
      focusArea: topWeakRecommendation,
      recommendations: activeRecommendations,
      recentActivity,
      metrics: {
        overallProgress: averageMastery ?? (analytics.averageQuizScore ?? 0),
        totalConcepts: validMastery.length,
        totalMaterials: materials.length,
        readyMaterialsCount,
        weakConceptsCount: needsAttentionCount,
      },
    };
  }

  async createProject(userId: string, input: z.infer<typeof createProjectSchema>) {
    const validated = createProjectSchema.parse(input);
    const project = await projectRepository.create(validated);

    // Record activity event
    await learningEventRepository.record({
      userId,
      projectId: project.id,
      eventType: 'PROJECT_CREATED',
      metadata: { name: project.name, learningGoal: project.learningGoal },
    });

    return project;
  }

  async deleteProject(projectId: string) {
    return projectRepository.delete(projectId);
  }
}

export const projectService = new ProjectService();
