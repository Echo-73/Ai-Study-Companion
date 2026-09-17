import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword, generateToken } from '../../src/utils/authUtils';

describe('PDF Material Processing Integration Tests', () => {
  let userToken = '';
  let userId = '';
  let spaceId = '';
  let projectId = '';

  beforeAll(async () => {
    const pwd = await hashPassword('password123');
    const user = await prisma.user.create({
      data: { name: 'PDF Tester', email: `pdf_${Date.now()}@example.com`, passwordHash: pwd },
    });
    userId = user.id;
    userToken = generateToken({ userId: user.id, email: user.email, role: user.role });

    const space = await prisma.space.create({
      data: { userId: user.id, name: 'PDF Space' },
    });
    spaceId = space.id;

    const project = await prisma.project.create({
      data: { spaceId: space.id, name: 'PDF Project', learningGoal: 'Test PDF RAG' },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('POST /api/projects/:projectId/materials/upload should create Material and enqueue background job', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/materials/upload`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Machine Learning Introduction' });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.material.id).toBeDefined();
    expect(res.body.data.material.status).toBe('QUEUED');
    expect(res.body.data.jobId).toBeDefined();

    const materialId = res.body.data.material.id;

    // Poll status endpoint
    const statusRes = await request(app)
      .get(`/api/projects/${projectId}/materials/${materialId}/status`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(['QUEUED', 'PROCESSING', 'READY']).toContain(statusRes.body.data.status);
  });

  it('POST /api/projects/:projectId/materials/upload should return 503 when storage is disabled (production mode)', async () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      const res = await request(app)
        .post(`/api/projects/${projectId}/materials/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Production Upload Attempt' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Persistent PDF storage is not configured');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});

