import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword, generateToken } from '../../src/utils/authUtils';

describe('Adaptive Quiz & Assessment Integration Tests', () => {
  let userToken = '';
  let userId = '';
  let spaceId = '';
  let projectId = '';
  let conceptId = '';

  beforeAll(async () => {
    const pwd = await hashPassword('password123');
    const user = await prisma.user.create({
      data: { name: 'Quiz Student', email: `quiz_${Date.now()}@example.com`, passwordHash: pwd },
    });
    userId = user.id;
    userToken = generateToken({ userId: user.id, email: user.email, role: user.role });

    const space = await prisma.space.create({
      data: { userId: user.id, name: 'Quiz Space' },
    });
    spaceId = space.id;

    const project = await prisma.project.create({
      data: { spaceId: space.id, name: 'Quiz Project', learningGoal: 'Master Algorithms' },
    });
    projectId = project.id;

    const concept = await prisma.concept.create({
      data: { projectId: project.id, name: 'Sorting Algorithms', description: 'QuickSort and MergeSort' },
    });
    conceptId = concept.id;

    await prisma.masteryRecord.create({
      data: { conceptId: concept.id, score: 0.3, status: 'REQUIRES_ATTENTION', evidence: 'Initial test setup' },
    });
  });

  afterAll(async () => {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('POST /api/projects/:projectId/quiz/generate should create adaptive quiz with MCQ & Open-Ended questions', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/quiz/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionCount: 4 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.questions.length).toBe(4);

    const quizId = res.body.data.id;
    const questions = res.body.data.questions;

    // Build responses
    const responses = questions.map((q: any) => ({
      questionId: q.id,
      userResponse: q.correctAnswer || 'Solid explanation of sorting algorithms.',
    }));

    // Submit Quiz
    const submitRes = await request(app)
      .post(`/api/projects/${projectId}/quiz/${quizId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ responses });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.overallScore).toBeGreaterThanOrEqual(0.7);
    expect(submitRes.body.data.assessment).toBeDefined();

    // Verify concept mastery was updated in database
    const updatedMastery = await prisma.masteryRecord.findMany({
      where: { conceptId },
      orderBy: { createdAt: 'desc' },
    });
    expect(updatedMastery.length).toBeGreaterThan(1);
    expect(updatedMastery[0].score).toBeGreaterThan(0.3);
  });
});
