import { prisma } from './src/config/prisma';
import { masteryService } from './src/services/masteryService';
import { recommendationService } from './src/services/recommendationService';
import { analyticsService } from './src/services/analyticsService';

async function check() {
  const projects = await prisma.project.findMany();
  for (const p of projects) {
    console.log(`\n================== PROJECT: "${p.name}" (${p.id}) ==================`);
    const mastery = await masteryService.getProjectMastery(p.id);
    console.log('Mastery:');
    if (mastery.length === 0) {
      console.log('  (No concepts yet)');
    } else {
      for (const m of mastery) {
        console.log(`  - Concept: "${m.name}", Score: ${m.scorePercentage}%, Questions: ${m.correctAnswers}/${m.totalQuestions}, Status: ${m.status}, Trend: ${m.trend}, hasData: ${m.hasData}`);
      }
    }

    const recs = await recommendationService.getRecommendations(p.id);
    console.log('Recommendations:');
    if (recs.length === 0) {
      console.log('  (No recommendations currently required)');
    } else {
      for (const r of recs) {
        console.log(`  - Title: "${r.title}", Concept: "${r.conceptName}", Action: "${r.actionText}"`);
      }
    }

    const analytics = await analyticsService.getProjectAnalytics(p.id);
    console.log('Analytics:');
    console.log(`  Quizzes Taken: ${analytics.quizzesTaken}, Avg Score: ${analytics.averageQuizScore}%, Total Interactions: ${analytics.totalInteractions}`);

    const events = await prisma.learningEvent.findMany({
      where: { projectId: p.id },
      orderBy: { timestamp: 'desc' },
      take: 6,
    });
    console.log('Recent Events:');
    for (const e of events) {
      console.log(`  - Type: ${e.eventType}, Time: ${e.timestamp.toISOString()}, Meta: ${JSON.stringify(e.metadata)}`);
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
