import { prisma } from '../config/prisma';
import { isValidConceptName, normalizeConceptName } from '../utils/conceptValidator';

export interface ConceptMasteryResult {
  conceptId: string;
  id: string;
  name: string;
  concept: string;
  conceptName: string;
  description?: string | null;
  score: number; // 0.0 to 1.0 (never NaN)
  currentScore: number;
  scorePercentage: number; // 0 to 100 (never NaN)
  percentage: number;
  status: 'NEW' | 'IMPROVING' | 'STABLE' | 'REQUIRES_ATTENTION';
  trend: 'improving' | 'declining' | 'stable' | 'NEW';
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  lastTestedAt: string | null;
  hasData: boolean;
  history: Array<{
    score: number;
    status: string;
    date: string;
  }>;
}

export class MasteryService {
  async getProjectMastery(projectId: string): Promise<ConceptMasteryResult[]> {
    const concepts = await prisma.concept.findMany({
      where: { projectId },
      include: {
        masteryRecords: {
          orderBy: { createdAt: 'desc' },
        },
        questions: {
          include: {
            quiz: {
              select: { id: true, title: true, score: true, completedAt: true, createdAt: true },
            },
            responses: {
              orderBy: { evaluatedAt: 'desc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const validConcepts = concepts.filter((c) => isValidConceptName(c.name));

    return validConcepts.map((c) => {
      // Collect all question responses for this concept
      const validResponses: Array<{ score: number; isCorrect: boolean; date: Date }> = [];

      for (const q of c.questions) {
        for (const r of q.responses) {
          if (typeof r.score === 'number' || typeof r.isCorrect === 'boolean') {
            const rScore = typeof r.score === 'number' ? r.score : (r.isCorrect ? 1.0 : 0.0);
            const isCorrect = r.isCorrect ?? (rScore >= 0.7);
            const date = r.evaluatedAt || q.quiz?.completedAt || q.quiz?.createdAt || new Date();
            validResponses.push({ score: rScore, isCorrect, date });
          }
        }
      }

      // Sort responses by date (oldest to newest for trend analysis)
      validResponses.sort((a, b) => a.date.getTime() - b.date.getTime());

      const totalQuestions = validResponses.length;
      const correctAnswers = validResponses.filter((r) => r.isCorrect).length;
      const incorrectAnswers = totalQuestions - correctAnswers;

      let score = 0;
      let status: 'NEW' | 'IMPROVING' | 'STABLE' | 'REQUIRES_ATTENTION' = 'NEW';
      let trend: 'improving' | 'declining' | 'stable' | 'NEW' = 'NEW';
      let hasData = false;
      let lastTestedAt: string | null = null;

      if (totalQuestions > 0) {
        hasData = true;
        const totalScoreSum = validResponses.reduce((acc, r) => acc + r.score, 0);
        score = Math.round((totalScoreSum / totalQuestions) * 100) / 100;

        if (score >= 0.8) {
          status = 'IMPROVING';
        } else if (score >= 0.5) {
          status = 'STABLE';
        } else {
          status = 'REQUIRES_ATTENTION';
        }

        if (totalQuestions >= 2) {
          const midPoint = Math.floor(totalQuestions / 2);
          const earlierResponses = validResponses.slice(0, midPoint);
          const laterResponses = validResponses.slice(midPoint);

          const earlierAvg = earlierResponses.reduce((acc, r) => acc + r.score, 0) / earlierResponses.length;
          const laterAvg = laterResponses.reduce((acc, r) => acc + r.score, 0) / laterResponses.length;

          const diff = laterAvg - earlierAvg;
          if (diff >= 0.05) {
            trend = 'improving';
          } else if (diff <= -0.05) {
            trend = 'declining';
          } else {
            trend = 'stable';
          }
        } else {
          trend = 'NEW';
        }

        const lastResp = validResponses[validResponses.length - 1];
        lastTestedAt = lastResp.date.toISOString();
      } else if (c.masteryRecords.length > 0 && !c.masteryRecords[0].evidence?.includes('Initial concept registration')) {
        const latest = c.masteryRecords[0];
        score = latest.score || 0;
        status = (latest.status as any) || 'NEW';
        trend = 'stable';
        hasData = true;
        lastTestedAt = latest.createdAt.toISOString();
      } else {
        score = 0;
        status = 'NEW';
        trend = 'NEW';
        hasData = false;
        lastTestedAt = null;
      }

      if (isNaN(score) || !isFinite(score)) {
        score = 0;
      }
      score = Math.min(Math.max(score, 0), 1);
      const scorePercentage = Math.round(score * 100);

      const cleanName = normalizeConceptName(c.name);

      return {
        conceptId: c.id,
        id: c.id,
        name: cleanName,
        concept: cleanName,
        conceptName: cleanName,
        description: c.description,
        score,
        currentScore: score,
        scorePercentage,
        percentage: scorePercentage,
        status,
        trend,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        lastTestedAt,
        hasData,
        history: c.masteryRecords.map((m) => ({
          score: m.score,
          status: m.status,
          date: m.createdAt.toISOString(),
        })),
      };
    });
  }
}

export const masteryService = new MasteryService();

