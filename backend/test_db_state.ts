import { prisma } from './src/config/prisma';
import { analyticsService } from './src/services/analyticsService';
import { masteryService } from './src/services/masteryService';
import { recommendationService } from './src/services/recommendationService';

async function main() {
  const events = await prisma.learningEvent.groupBy({
    by: ['eventType'],
    _count: { id: true }
  });
  console.log('Events in DB:', events);
  
  const projects = await prisma.project.findMany();
  console.log('Projects:', projects.map(p => ({ id: p.id, name: p.name })));

  if (projects.length > 0) {
    const pId = projects[0].id;
    console.log('--- Checking Project:', pId, '---');
    const analytics = await analyticsService.getProjectAnalytics(pId);
    console.log('Analytics summary:', {
      totalInteractions: analytics.totalInteractions,
      quizzesTaken: analytics.quizzesTaken,
      tutorQuestions: analytics.tutorQuestions,
      materialsUploaded: analytics.materialsUploaded,
      averageQuizScore: analytics.averageQuizScore,
      activityBreakdown: analytics.activityBreakdown,
      quizTrend: analytics.quizTrend,
    });

    const mastery = await masteryService.getProjectMastery(pId);
    console.log('Mastery result:', JSON.stringify(mastery, null, 2));

    const recs = await recommendationService.getRecommendations(pId);
    console.log('Recommendations result:', JSON.stringify(recs, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
