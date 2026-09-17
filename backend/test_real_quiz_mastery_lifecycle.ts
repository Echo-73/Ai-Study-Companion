import { prisma } from './src/config/prisma';
import { quizGenerationService } from './src/services/quizGenerationService';
import { masteryService } from './src/services/masteryService';
import { recommendationService } from './src/services/recommendationService';
import { analyticsService } from './src/services/analyticsService';

async function testLifecycle() {
  console.log('===============================================================');
  console.log('TESTING REAL QUIZ GENERATION, SUBMISSION & CONCEPT MASTERY FLOW');
  console.log('===============================================================\n');

  // Find the user and active project "Supervised Learning"
  const project = await prisma.project.findFirst({
    where: { name: 'Supervised Learning' },
  });

  if (!project) {
    throw new Error('Project "Supervised Learning" not found!');
  }

  const space = await prisma.space.findUnique({ where: { id: project.spaceId } });
  const userId = space?.userId;
  if (!userId) {
    throw new Error('User not found for space');
  }

  console.log(`[TARGET PROJECT]: "${project.name}" (ID: ${project.id})`);
  console.log(`[LEARNING GOAL]: "${project.learningGoal}"`);
  console.log(`[USER ID]: ${userId}\n`);

  // 1. Generate an Adaptive Quiz using Gemini
  console.log('--- GENERATING ADAPTIVE QUIZ WITH GEMINI ---');
  const quiz = await quizGenerationService.generateAdaptiveQuiz({
    userId,
    projectId: project.id,
    questionCount: 4,
    topic: 'Supervised and Unsupervised Learning',
  });

  if (!quiz) {
    throw new Error('Quiz generation failed');
  }

  console.log(`✔ Quiz generated: "${quiz.title}" (ID: ${quiz.id})`);
  console.log(`Total questions: ${quiz.questions.length}\n`);

  console.log('--- INSPECTING GENERATED QUESTIONS & CONCEPTS ---');
  const responsesToSubmit: Array<{ questionId: string; userResponse: string }> = [];

  for (let idx = 0; idx < quiz.questions.length; idx++) {
    const q = quiz.questions[idx];
    const concept = q.conceptId
      ? await prisma.concept.findUnique({ where: { id: q.conceptId } })
      : null;

    console.log(`Question ${idx + 1}:`);
    console.log(`  Prompt: "${q.prompt.slice(0, 80)}..."`);
    console.log(`  Type: ${q.type}`);
    console.log(`  Concept Name: "${concept?.name || 'UNASSIGNED'}"`);
    console.log(`  Correct Answer: "${q.correctAnswer?.slice(0, 60)}..."`);

    // Ensure NO invalid concepts were generated
    const conceptName = concept?.name || '';
    if (['January', 'Springer', 'Nature', 'Machine', 'Learning'].includes(conceptName)) {
      throw new Error(`CRITICAL BUG: Invalid concept "${conceptName}" was generated!`);
    }

    // Prepare answer: let's make Q1 correct, Q2 incorrect, Q3 correct, Q4 incorrect
    const isAnswerCorrect = idx % 2 === 0;
    const answer = isAnswerCorrect ? (q.correctAnswer || 'Correct Answer') : 'An incorrect random response';
    responsesToSubmit.push({ questionId: q.id, userResponse: answer });
  }

  // 2. Submit the Quiz
  console.log('\n--- SUBMITTING QUIZ RESPONSES ---');
  const submissionResult = await quizGenerationService.submitQuiz({
    userId,
    projectId: project.id,
    quizId: quiz.id,
    responses: responsesToSubmit,
  });

  console.log(`✔ Quiz submitted! Score: ${Math.round(submissionResult.overallScore * 100)}%`);

  // 3. Verify Concept Mastery Calculation
  console.log('\n--- VERIFYING RESULTING CONCEPT MASTERY ---');
  const mastery = await masteryService.getProjectMastery(project.id);
  console.log(`Total valid concepts tracked: ${mastery.length}`);
  for (const m of mastery) {
    console.log(`  * Concept: "${m.name}"`);
    console.log(`    Score: ${m.scorePercentage}% (${m.correctAnswers}/${m.totalQuestions} questions correct)`);
    console.log(`    Status: ${m.status}, Trend: ${m.trend}, hasData: ${m.hasData}`);
  }

  if (mastery.length === 0) {
    throw new Error('Expected at least one valid concept tracked after quiz submission!');
  }

  for (const m of mastery) {
    if (['January', 'Springer', 'Nature', 'Machine', 'Learning'].includes(m.name)) {
      throw new Error(`CRITICAL BUG: Invalid concept "${m.name}" found in mastery!`);
    }
  }

  // 4. Verify Recommendations
  console.log('\n--- VERIFYING RESULTING RECOMMENDATIONS ---');
  const recommendations = await recommendationService.getRecommendations(project.id);
  console.log(`Recommendations count: ${recommendations.length}`);
  for (const r of recommendations) {
    console.log(`  * Recommendation: "${r.title}"`);
    console.log(`    Concept: "${r.conceptName}"`);
    console.log(`    Reason: "${r.reason}"`);
    console.log(`    Action: "${r.actionText}" (${r.actionType})`);
  }

  for (const r of recommendations) {
    if (['January', 'Springer', 'Nature', 'Machine', 'Learning'].includes(r.conceptName || '')) {
      throw new Error(`CRITICAL BUG: Invalid concept "${r.conceptName}" found in recommendation!`);
    }
  }

  // 5. Verify Analytics
  console.log('\n--- VERIFYING ANALYTICS ---');
  const analytics = await analyticsService.getProjectAnalytics(project.id);
  console.log(`  Quizzes Taken: ${analytics.quizzesTaken}`);
  console.log(`  Average Quiz Score: ${analytics.averageQuizScore}%`);
  console.log(`  Total Interactions: ${analytics.totalInteractions}`);
  console.log(`  Concept Mastery Count: ${analytics.conceptMastery.length}`);

  console.log('\n===============================================================');
  console.log('REAL QUIZ LIFECYCLE COMPLETED SUCCESSFULLY WITH CLEAN CONCEPTS!');
  console.log('===============================================================\n');
}

testLifecycle()
  .catch((err) => {
    console.error('Lifecycle test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
