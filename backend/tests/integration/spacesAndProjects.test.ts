import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword, generateToken } from '../../src/utils/authUtils';

describe('Spaces & Projects API Integration Tests', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';
  let spaceAId = '';
  let projectAId = '';

  beforeAll(async () => {
    // Create User A
    const pwdA = await hashPassword('password123');
    const userA = await prisma.user.create({
      data: { name: 'User A', email: `space_a_${Date.now()}@example.com`, passwordHash: pwdA },
    });
    userAId = userA.id;
    userAToken = generateToken({ userId: userA.id, email: userA.email, role: userA.role });

    // Create User B
    const pwdB = await hashPassword('password123');
    const userB = await prisma.user.create({
      data: { name: 'User B', email: `space_b_${Date.now()}@example.com`, passwordHash: pwdB },
    });
    userBId = userB.id;
    userBToken = generateToken({ userId: userB.id, email: userB.email, role: userB.role });
  });

  afterAll(async () => {
    if (userAId) await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await prisma.$disconnect();
  });

  it('POST /api/spaces should create a new Space for User A', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Computer Science', description: 'AI & ML Studies' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Computer Science');
    expect(res.body.data.userId).toBe(userAId);

    spaceAId = res.body.data.id;
  });

  it('GET /api/spaces should list User A\'s Spaces', async () => {
    const res = await request(app)
      .get('/api/spaces')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/projects should create a Project inside User A\'s Space and record PROJECT_CREATED event', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        spaceId: spaceAId,
        name: 'Neural Networks 101',
        learningGoal: 'Master Deep Learning Basics',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Neural Networks 101');

    projectAId = res.body.data.id;

    // Verify activity event recorded
    const events = await prisma.learningEvent.findMany({ where: { projectId: projectAId } });
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('PROJECT_CREATED');
  });

  it('GET /api/projects/:projectId should return Project Dashboard details for User A', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectAId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project.name).toBe('Neural Networks 101');
    expect(res.body.data.metrics.overallProgress).toBeDefined();
  });

  it('User B is forbidden (403) from accessing User A\'s Project Dashboard', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectAId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  it('DELETE /api/projects/:projectId should allow owner to delete project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectAId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
