import { recommendationRepository } from '../repositories/recommendationRepository';
import { masteryService } from './masteryService';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { isValidConceptName, normalizeConceptName } from '../utils/conceptValidator';

export class RecommendationService {
  async getRecommendations(projectId: string) {
    const raw = await recommendationRepository.getProjectRecommendations(projectId);
    const concepts = await prisma.concept.findMany({ where: { projectId } });

    const validItems = [];

    for (const r of raw) {
      const matchedConcept =
        concepts.find((c) => c.id === r.targetId) ||
        concepts.find((c) => r.title.toLowerCase().includes(c.name.toLowerCase()));

      let candidateName = matchedConcept
        ? matchedConcept.name
        : r.title.replace(/^Review\s+/i, '').replace(/^Focus on\s+/i, '').replace(/^Keep practicing\s+/i, '').trim();

      // If the candidate name is not a valid academic concept, skip it
      if (!isValidConceptName(candidateName)) {
        continue;
      }

      const cleanConceptName = normalizeConceptName(candidateName);

      let actionType: 'REVIEW_MATERIAL' | 'TAKE_QUIZ' | 'ASK_TUTOR' = 'TAKE_QUIZ';
      if (r.targetType === 'material') actionType = 'REVIEW_MATERIAL';
      else if (r.targetType === 'tutor') actionType = 'ASK_TUTOR';

      validItems.push({
        id: r.id,
        projectId: r.projectId,
        conceptId: r.targetId || matchedConcept?.id || '',
        conceptName: cleanConceptName,
        concept: cleanConceptName,
        title: r.title,
        description: r.reason,
        reason: r.reason,
        actionText: r.actionText,
        actionType,
        isDismissed: r.isDismissed,
        createdAt: r.createdAt.toISOString(),
      });
    }

    return validItems;
  }

  async dismissRecommendation(projectId: string, recommendationId: string) {
    const rec = await recommendationRepository.findById(recommendationId);
    if (!rec) {
      throw new AppError('Recommendation not found', 404);
    }
    if (rec.projectId !== projectId) {
      throw new AppError('Unauthorized', 403);
    }

    return recommendationRepository.dismissRecommendation(recommendationId);
  }

  async generateRecommendationsFromMastery(projectId: string) {
    const masteryList = await masteryService.getProjectMastery(projectId);

    // Dismiss existing active recommendations to refresh them based on latest performance
    await prisma.recommendation.updateMany({
      where: { projectId, isDismissed: false },
      data: { isDismissed: true },
    });

    const weakConcepts = masteryList.filter((c) => c.hasData && c.score < 0.6 && isValidConceptName(c.name));
    const strongConcepts = masteryList.filter((c) => c.hasData && c.score >= 0.8 && isValidConceptName(c.name));

    for (const c of weakConcepts) {
      const scorePct = Math.round(c.score * 100);
      await recommendationRepository.createRecommendation({
        projectId,
        title: `Focus on ${c.name}`,
        actionText: 'Take a focused quiz',
        reason: `Your recent quiz performance in ${c.name} is ${scorePct}%. Review the material and take another practice quiz.`,
        targetType: 'quiz',
        targetId: c.conceptId,
      });
    }

    for (const c of strongConcepts.slice(0, 2)) {
      const scorePct = Math.round(c.score * 100);
      await recommendationRepository.createRecommendation({
        projectId,
        title: `Keep practicing ${c.name}`,
        actionText: 'Challenge with adaptive quiz',
        reason: `Your performance in ${c.name} is strong at ${scorePct}%. Try a harder adaptive quiz to reinforce your understanding.`,
        targetType: 'quiz',
        targetId: c.conceptId,
      });
    }
  }
}

export const recommendationService = new RecommendationService();

