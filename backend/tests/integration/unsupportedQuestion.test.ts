import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword, generateToken } from '../../src/utils/authUtils';

describe('Unsupported Question Handling Integration Tests', () => {
  let userToken = '';
  let userId = '';
  let spaceId = '';
  let emptyProjectId = '';

  beforeAll(async () => {
    const pwd = await hashPassword('password123');
    const user = await prisma.user.create({
      data: { name: 'Guard Tester', email: `guard_${Date.now()}@example.com`, passwordHash: pwd },
    });
    userId = user.id;
    userToken = generateToken({ userId: user.id, email: user.email, role: user.role });

    const space = await prisma.space.create({
      data: { userId: user.id, name: 'Empty Space' },
    });
    spaceId = space.id;

    // Create a project with NO materials
    const project = await prisma.project.create({
      data: { spaceId: space.id, name: 'Empty Project', learningGoal: 'Test Guardrails' },
    });
    emptyProjectId = project.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('POST /api/projects/:projectId/tutor/chat for project with no material should return isSupported: false', async () => {
    const res = await request(app)
      .post(`/api/projects/${emptyProjectId}/tutor/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'What is Quantum Chromodynamics?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isSupported).toBe(false);
    expect(res.body.data.message.content).toContain('do not have sufficient evidence');
    expect(res.body.data.citations).toHaveLength(0);
  });
});
