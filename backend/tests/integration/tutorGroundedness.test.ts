import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword, generateToken } from '../../src/utils/authUtils';
import { embeddingService } from '../../src/services/embeddingService';

describe('Tutor Groundedness & RAG Integration Tests', () => {
  let userToken = '';
  let userId = '';
  let spaceId = '';
  let projectId = '';
  let materialId = '';

  beforeAll(async () => {
    const pwd = await hashPassword('password123');
    const user = await prisma.user.create({
      data: { name: 'Tutor Student', email: `tutor_${Date.now()}@example.com`, passwordHash: pwd },
    });
    userId = user.id;
    userToken = generateToken({ userId: user.id, email: user.email, role: user.role });

    const space = await prisma.space.create({
      data: { userId: user.id, name: 'AI Studies' },
    });
    spaceId = space.id;

    const project = await prisma.project.create({
      data: { spaceId: space.id, name: 'Deep Learning', learningGoal: 'Master Backpropagation' },
    });
    projectId = project.id;

    // Seed material & material chunk with matching embedding vector
    const material = await prisma.material.create({
      data: { projectId: project.id, title: 'Neural Networks Basics', pageCount: 12, status: 'READY' },
    });
    materialId = material.id;

    const chunkText = 'Backpropagation computes the gradient of the loss function with respect to each weight by the chain rule.';
    const embeddingVector = await embeddingService.generateEmbedding(chunkText);

    await prisma.materialChunk.create({
      data: {
        materialId: material.id,
        projectId: project.id,
        chunkIndex: 0,
        content: chunkText,
        pageNumber: 5,
        tokenCount: 20,
        embedding: embeddingVector as any,
      },
    });
  });

  afterAll(async () => {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('POST /api/projects/:projectId/tutor/chat should return grounded answer with citations when material exists', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tutor/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'Backpropagation computes the gradient of the loss function' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isSupported).toBe(true);
    expect(res.body.data.message.content).toBeDefined();
    expect(res.body.data.citations.length).toBeGreaterThan(0);
    expect(res.body.data.citations[0].materialTitle).toBe('Neural Networks Basics');
    expect(res.body.data.citations[0].pageNumber).toBe(5);

    // Verify AI Usage log was created
    const usageLogs = await prisma.aIUsageLog.findMany({ where: { projectId } });
    expect(usageLogs.length).toBeGreaterThanOrEqual(1);
    expect(usageLogs[0].feature).toBe('tutor_rag');
  });
});
