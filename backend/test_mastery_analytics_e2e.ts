import { prisma } from './src/config/prisma';
import request from 'supertest';
import { app } from './src/app';
import { hashPassword, generateToken } from './src/utils/authUtils';
import { masteryService } from './src/services/masteryService';
import { recommendationService } from './src/services/recommendationService';
import { analyticsService } from './src/services/analyticsService';

async function runE2ETests() {
  console.log('====================================================');
  console.log('STARTING MASTERY, ANALYTICS & TUTOR E2E VERIFICATION');
  console.log('====================================================\n');

  // 1. Create a clean user, space, and 2 isolated projects
  const pwd = await hashPassword('password123');
  const user = await prisma.user.create({
    data: {
      name: 'Analytics Tester',
      email: `tester_${Date.now()}@analytics.com`,
      passwordHash: pwd,
    },
  });
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  const space = await prisma.space.create({
    data: { name: 'AI & Data Science Space', userId: user.id },
  });

  const projectA = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: 'Project A - Machine Learning',
      learningGoal: 'Master ML Foundations',
    },
  });

  const projectB = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: 'Project B - Isolated Project',
      learningGoal: 'Independent Goal',
    },
  });

  console.log(`[1. SETUP] Created User (${user.id}), Project A (${projectA.id}), Project B (${projectB.id})`);

  // 2. Verify AI Tutor still works and responds
  console.log('\n--- VERIFYING AI TUTOR FUNCTIONALITY ---');
  const tutorRes = await request(app)
    .post(`/api/projects/${projectA.id}/tutor/chat`)
    .set('Authorization', `Bearer ${token}`)
    .send({ question: 'What is machine learning?' });

  console.log(`Tutor response status: ${tutorRes.status}`);
  console.log(`Tutor isSupported: ${tutorRes.body.data?.isSupported}`);
  console.log(`Tutor response excerpt: "${tutorRes.body.data?.answer?.slice(0, 80)}..."`);
  if (tutorRes.status !== 200 || !tutorRes.body.data?.answer) {
    throw new Error('AI Tutor failed to respond!');
  }
  console.log('✔ AI Tutor is active and responding correctly.');

  // 3. Create real concepts for Project A
  const conceptSup = await prisma.concept.create({
    data: { projectId: projectA.id, name: 'Supervised Learning', description: 'Learning with labeled data' },
  });
  const conceptRein = await prisma.concept.create({
    data: { projectId: projectA.id, name: 'Reinforcement Learning', description: 'Learning with rewards and penalties' },
  });
  const conceptUnsup = await prisma.concept.create({
    data: { projectId: projectA.id, name: 'Unsupervised Learning', description: 'Finding hidden patterns' },
  });

  console.log('\n--- SEEDING QUIZ 1 ---');
  // 4. Create Quiz 1: 5 questions
  // 2 Supervised (user gets 2 correct)
  // 2 Reinforcement (user gets 0 correct)
  // 1 Unsupervised (user gets 1 correct)
  const quiz1 = await prisma.quiz.create({
    data: {
      projectId: projectA.id,
      title: 'Quiz 1: ML Fundamentals',
      score: 3 / 5, // 0.60
      completedAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
  });

  const quiz1Id = quiz1.id;

  const q1 = await prisma.question.create({
    data: {
      quizId: quiz1Id,
      conceptId: conceptSup.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'What uses labeled datasets for training?',
      options: ['Supervised Learning', 'Unsupervised Learning', 'Clustering', 'PCA'],
      correctAnswer: 'Supervised Learning',
      difficulty: 0.3,
    },
  });

  const q2 = await prisma.question.create({
    data: {
      quizId: quiz1Id,
      conceptId: conceptSup.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'Is Linear Regression supervised?',
      options: ['Yes', 'No'],
      correctAnswer: 'Yes',
      difficulty: 0.3,
    },
  });

  const q3 = await prisma.question.create({
    data: {
      quizId: quiz1Id,
      conceptId: conceptRein.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'What role does an agent play in RL?',
      options: ['Takes actions in an environment', 'Labels images', 'Clusters text', 'Extracts PCA'],
      correctAnswer: 'Takes actions in an environment',
      difficulty: 0.5,
    },
  });

  const q4 = await prisma.question.create({
    data: {
      quizId: quiz1Id,
      conceptId: conceptRein.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'What is Q-learning?',
      options: ['Model-free RL algorithm', 'Supervised regression', 'Clustering', 'Decision Tree'],
      correctAnswer: 'Model-free RL algorithm',
      difficulty: 0.6,
    },
  });

  const q5 = await prisma.question.create({
    data: {
      quizId: quiz1Id,
      conceptId: conceptUnsup.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'What is K-means?',
      options: ['Clustering algorithm', 'Regression', 'Classification', 'Reward function'],
      correctAnswer: 'Clustering algorithm',
      difficulty: 0.4,
    },
  });

  // Submit Question Responses for Quiz 1:
  // Q1 (Sup): Correct
  // Q2 (Sup): Correct
  // Q3 (Rein): Incorrect
  // Q4 (Rein): Incorrect
  // Q5 (Unsup): Correct
  await prisma.questionResponse.createMany({
    data: [
      {
        questionId: q1.id,
        userResponse: 'Supervised Learning',
        isCorrect: true,
        score: 1,
      },
      {
        questionId: q2.id,
        userResponse: 'Yes',
        isCorrect: true,
        score: 1,
      },
      {
        questionId: q3.id,
        userResponse: 'Labels images', // WRONG
        isCorrect: false,
        score: 0,
      },
      {
        questionId: q4.id,
        userResponse: 'Clustering', // WRONG
        isCorrect: false,
        score: 0,
      },
      {
        questionId: q5.id,
        userResponse: 'Clustering algorithm',
        isCorrect: true,
        score: 1,
      },
    ],
  });

  // Record quiz completion event
  await prisma.learningEvent.create({
    data: {
      userId: user.id,
      projectId: projectA.id,
      eventType: 'ASSESSMENT_COMPLETED',
      metadata: { quizId: quiz1Id, score: 0.6 },
    },
  });

  // Update recommendations from mastery
  await recommendationService.generateRecommendationsFromMastery(projectA.id);

  // Verify Mastery after Quiz 1
  console.log('\n--- VERIFYING MASTERY AFTER QUIZ 1 ---');
  const mastery1 = await masteryService.getProjectMastery(projectA.id);
  console.log('Mastery after Quiz 1:');
  mastery1.forEach(m => {
    console.log(`  ${m.name}: ${m.scorePercentage}% (${m.correctAnswers}/${m.totalQuestions}) - Status: ${m.status}, Trend: ${m.trend}`);
  });

  const reinMastery1 = mastery1.find(m => m.name === 'Reinforcement Learning');
  const supMastery1 = mastery1.find(m => m.name === 'Supervised Learning');
  const unsupMastery1 = mastery1.find(m => m.name === 'Unsupervised Learning');

  if (!reinMastery1 || reinMastery1.scorePercentage !== 0) {
    throw new Error(`Expected Reinforcement Learning to be 0%, got ${reinMastery1?.scorePercentage}%`);
  }
  if (!supMastery1 || supMastery1.scorePercentage !== 100) {
    throw new Error(`Expected Supervised Learning to be 100%, got ${supMastery1?.scorePercentage}%`);
  }
  if (!unsupMastery1 || unsupMastery1.scorePercentage !== 100) {
    throw new Error(`Expected Unsupervised Learning to be 100%, got ${unsupMastery1?.scorePercentage}%`);
  }
  console.log('✔ Concept mastery calculated accurately from actual question responses.');

  // Verify Recommendations after Quiz 1
  console.log('\n--- VERIFYING RECOMMENDATIONS AFTER QUIZ 1 ---');
  const recs1 = await recommendationService.getRecommendations(projectA.id);
  console.log('Recommendations count:', recs1.length);
  recs1.forEach(r => {
    console.log(`  Title: "${r.title}", Concept: "${r.conceptName}", Reason: "${r.reason}"`);
  });

  if (recs1.length === 0) {
    throw new Error('Expected at least 1 recommendation for weak concept!');
  }
  const reinRec = recs1.find(r => r.conceptName === 'Reinforcement Learning');
  if (!reinRec) {
    throw new Error('Recommendation should specifically target Reinforcement Learning!');
  }
  if (!reinRec.conceptName || reinRec.conceptName.trim() === '') {
    throw new Error('Recommendation conceptName must NOT be empty or blank!');
  }
  console.log('✔ Recommendation accurately generated for weak concept without empty fields.');

  // 5. Submit Quiz 2:
  // 4 questions:
  // 2 Reinforcement Learning: 1 correct, 1 wrong (1/2 = 50%)
  // 2 Supervised Learning: 1 correct, 1 wrong (1/2 = 50%)
  console.log('\n--- SEEDING QUIZ 2 ---');
  const quiz2 = await prisma.quiz.create({
    data: {
      projectId: projectA.id,
      title: 'Quiz 2: Advanced Topics',
      score: 2 / 4, // 0.50
      completedAt: new Date(),
    },
  });

  const quiz2Id = quiz2.id;

  const q2_1 = await prisma.question.create({
    data: {
      quizId: quiz2Id,
      conceptId: conceptRein.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'What is a policy in RL?',
      options: ['Mapping from states to actions', 'Database index', 'Loss function'],
      correctAnswer: 'Mapping from states to actions',
      difficulty: 0.6,
    },
  });

  const q2_2 = await prisma.question.create({
    data: {
      quizId: quiz2Id,
      conceptId: conceptRein.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'What is exploration vs exploitation?',
      options: ['A fundamental dilemma in RL', 'A sorting technique', 'A neural layer'],
      correctAnswer: 'A fundamental dilemma in RL',
      difficulty: 0.7,
    },
  });

  const q2_3 = await prisma.question.create({
    data: {
      quizId: quiz2Id,
      conceptId: conceptSup.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'What is overfitting in Supervised Learning?',
      options: ['Memorizing noise in training data', 'High training error', 'Fast convergence'],
      correctAnswer: 'Memorizing noise in training data',
      difficulty: 0.5,
    },
  });

  const q2_4 = await prisma.question.create({
    data: {
      quizId: quiz2Id,
      conceptId: conceptSup.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'What is the purpose of cross-validation?',
      options: ['Estimate model generalization', 'Speed up inference', 'Reduce data size'],
      correctAnswer: 'Estimate model generalization',
      difficulty: 0.5,
    },
  });

  // Submit Question Responses for Quiz 2:
  // Q1 (Rein): Correct
  // Q2 (Rein): Incorrect
  // Q3 (Sup): Correct
  // Q4 (Sup): Incorrect
  await prisma.questionResponse.createMany({
    data: [
      {
        questionId: q2_1.id,
        userResponse: 'Mapping from states to actions',
        isCorrect: true,
        score: 1,
      },
      {
        questionId: q2_2.id,
        userResponse: 'A sorting technique', // WRONG
        isCorrect: false,
        score: 0,
      },
      {
        questionId: q2_3.id,
        userResponse: 'Memorizing noise in training data',
        isCorrect: true,
        score: 1,
      },
      {
        questionId: q2_4.id,
        userResponse: 'Reduce data size', // WRONG
        isCorrect: false,
        score: 0,
      },
    ],
  });

  await prisma.learningEvent.create({
    data: {
      userId: user.id,
      projectId: projectA.id,
      eventType: 'ASSESSMENT_COMPLETED',
      metadata: { quizId: quiz2Id, score: 0.5 },
    },
  });

  // Update recommendations from mastery
  await recommendationService.generateRecommendationsFromMastery(projectA.id);

  // Verify Cumulative Mastery across Quiz 1 and Quiz 2
  console.log('\n--- VERIFYING CUMULATIVE MASTERY (QUIZ 1 + QUIZ 2) ---');
  const mastery2 = await masteryService.getProjectMastery(projectA.id);
  mastery2.forEach(m => {
    console.log(`  ${m.name}: ${m.scorePercentage}% (${m.correctAnswers}/${m.totalQuestions}) - Status: ${m.status}, Trend: ${m.trend}`);
  });

  // Expected:
  // Reinforcement Learning: Quiz 1: 0/2, Quiz 2: 1/2 -> Total: 1/4 = 25%. Trend: improving!
  // Supervised Learning: Quiz 1: 2/2, Quiz 2: 1/2 -> Total: 3/4 = 75%.
  // Unsupervised Learning: Quiz 1: 1/1, Quiz 2: 0/0 -> Total: 1/1 = 100%.
  const rein2 = mastery2.find(m => m.name === 'Reinforcement Learning');
  const sup2 = mastery2.find(m => m.name === 'Supervised Learning');
  const unsup2 = mastery2.find(m => m.name === 'Unsupervised Learning');

  if (rein2?.totalQuestions !== 4 || rein2?.correctAnswers !== 1 || rein2?.scorePercentage !== 25) {
    throw new Error(`RL mastery mismatch! Expected 1/4 (25%), got ${rein2?.correctAnswers}/${rein2?.totalQuestions} (${rein2?.scorePercentage}%)`);
  }
  if (rein2?.trend !== 'improving') {
    throw new Error(`Expected RL trend to be 'improving' (from 0% to 50% in recent quiz), got ${rein2?.trend}`);
  }
  if (sup2?.totalQuestions !== 4 || sup2?.correctAnswers !== 3 || sup2?.scorePercentage !== 75) {
    throw new Error(`SL mastery mismatch! Expected 3/4 (75%), got ${sup2?.correctAnswers}/${sup2?.totalQuestions} (${sup2?.scorePercentage}%)`);
  }
  if (unsup2?.totalQuestions !== 1 || unsup2?.correctAnswers !== 1 || unsup2?.scorePercentage !== 100) {
    throw new Error(`Unsup mastery mismatch! Expected 1/1 (100%), got ${unsup2?.correctAnswers}/${unsup2?.totalQuestions} (${unsup2?.scorePercentage}%)`);
  }
  console.log('✔ Cumulative mastery correctly computed across multiple quizzes (Total Correct / Total Attempted).');
  console.log('✔ Trend correctly computed from historical quiz performance (0% -> 50% = improving).');

  // 6. Verify Analytics Endpoint
  console.log('\n--- VERIFYING ANALYTICS ENDPOINT ---');
  const analyticsRes = await request(app)
    .get(`/api/projects/${projectA.id}/analytics`)
    .set('Authorization', `Bearer ${token}`);

  console.log('Analytics status:', analyticsRes.status);
  const data = analyticsRes.body.data;
  console.log('Analytics data:', {
    totalInteractions: data.totalInteractions,
    quizzesTaken: data.quizzesTaken,
    averageQuizScore: data.averageQuizScore,
    tutorQuestions: data.tutorQuestions,
    recentQuizzesCount: data.recentQuizzes?.length,
  });

  // Quizzes taken should be 2
  if (data.quizzesTaken !== 2) {
    throw new Error(`Expected quizzesTaken = 2, got ${data.quizzesTaken}`);
  }
  // Average quiz score: (60 + 50) / 2 = 55%
  if (data.averageQuizScore !== 55) {
    throw new Error(`Expected averageQuizScore = 55, got ${data.averageQuizScore}`);
  }
  // Dates in recentQuizzes must be valid ISO strings and not "Invalid Date"
  for (const q of data.recentQuizzes) {
    const d = new Date(q.completedAt || q.date);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date found in recentQuizzes: ${q.completedAt || q.date}`);
    }
  }
  console.log('✔ Analytics metrics (quizzesTaken = 2, averageScore = 55%) are completely accurate.');
  console.log('✔ All quiz dates are verified valid ISO dates.');

  // 7. Verify Project Isolation
  console.log('\n--- VERIFYING PROJECT ISOLATION ---');
  const projectBAnalytics = await analyticsService.getProjectAnalytics(projectB.id);
  console.log('Project B (empty project) Analytics:', {
    quizzesTaken: projectBAnalytics.quizzesTaken,
    averageQuizScore: projectBAnalytics.averageQuizScore,
    totalInteractions: projectBAnalytics.totalInteractions,
    conceptMasteryCount: projectBAnalytics.conceptMastery.length,
  });

  if (projectBAnalytics.quizzesTaken !== 0) {
    throw new Error(`Project B should have 0 quizzes taken, got ${projectBAnalytics.quizzesTaken}`);
  }
  if (projectBAnalytics.averageQuizScore !== null) {
    throw new Error(`Project B should have null averageQuizScore, got ${projectBAnalytics.averageQuizScore}`);
  }
  console.log('✔ Project isolation verified: Project B is completely unaffected by Project A data.');

  console.log('\n====================================================');
  console.log('ALL E2E CHECKS PASSED PERFECTLY!');
  console.log('====================================================');
}

runE2ETests()
  .catch(err => {
    console.error('\n❌ E2E TEST FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
