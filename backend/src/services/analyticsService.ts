import { prisma } from '../config/prisma';
import { masteryService } from './masteryService';

export class AnalyticsService {
  async getProjectAnalytics(projectId: string) {
    // 1. Activity Breakdown (Learning Events)
    const events = await prisma.learningEvent.groupBy({
      by: ['eventType'],
      where: { projectId },
      _count: {
        id: true,
      },
    });

    const activityBreakdown = events.reduce((acc, curr) => {
      acc[curr.eventType] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // 2. Completed Quizzes & Average Score
    const completedQuizzes = await prisma.quiz.findMany({
      where: { projectId, score: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        score: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const quizzesTaken = completedQuizzes.length;
    const totalScoreSum = completedQuizzes.reduce((sum, q) => sum + (q.score ?? 0), 0);
    const averageQuizScore = quizzesTaken > 0 ? Math.round((totalScoreSum / quizzesTaken) * 100) : null;

    // 3. Tutor Messages Count
    const tutorMessagesCount =
      activityBreakdown['TUTOR_INTERACTION'] ||
      activityBreakdown['TUTOR_CHAT'] ||
      (await prisma.message.count({
        where: {
          conversation: {
            projectId,
          },
          sender: 'user',
        },
      }));

    // 4. Materials Uploaded Count
    const materialsUploaded = await prisma.material.count({
      where: { projectId },
    });

    // Raw total events in database
    const rawTotalEvents = events.reduce((sum, curr) => sum + curr._count.id, 0);
    const totalInteractions = rawTotalEvents;

    // Provide robust aliases in activityBreakdown so any frontend metric lookup succeeds
    activityBreakdown['QUIZ_SUBMITTED'] = quizzesTaken;
    activityBreakdown['QUIZ_COMPLETED'] = quizzesTaken;
    activityBreakdown['ASSESSMENT_COMPLETED'] = quizzesTaken || (activityBreakdown['ASSESSMENT_COMPLETED'] || 0);
    activityBreakdown['TUTOR_CHAT'] = tutorMessagesCount;
    activityBreakdown['TUTOR_INTERACTION'] = tutorMessagesCount;
    activityBreakdown['MATERIAL_UPLOADED'] = materialsUploaded;

    // 5. Concept Mastery (Single Source of Truth)
    const conceptMastery = await masteryService.getProjectMastery(projectId);

    const masteryDistribution = {
      IMPROVING: 0,
      STABLE: 0,
      REQUIRES_ATTENTION: 0,
      NEW: 0,
    };

    conceptMastery.forEach((c) => {
      if (c.status in masteryDistribution) {
        masteryDistribution[c.status as keyof typeof masteryDistribution]++;
      } else {
        masteryDistribution.NEW++;
      }
    });

    // 6. Quiz Performance Trend & Recent Quizzes (Safe ISO dates and frontend aliases)
    const quizTrend = completedQuizzes.map((q) => {
      const dateObj = q.completedAt || q.createdAt || new Date();
      const isoDate = dateObj.toISOString();
      return {
        id: q.id,
        title: q.title,
        score: q.score ?? 0,
        scorePercentage: Math.round((q.score ?? 0) * 100),
        completedAt: isoDate,
        date: isoDate, // ALIAS FOR FRONTEND
        dateFormatted: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    });

    return {
      totalInteractions,
      quizzesTaken,
      tutorQuestions: tutorMessagesCount,
      materialsUploaded,
      averageQuizScore,
      activityBreakdown,
      masteryDistribution,
      quizTrend,
      recentQuizzes: quizTrend,
      conceptMastery,
      tutorMessagesCount,
    };
  }
}

export const analyticsService = new AnalyticsService();

