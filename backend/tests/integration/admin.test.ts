import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { Role } from '@prisma/client';
import { hashPassword, generateToken } from '../../src/utils/authUtils';

describe('Admin API Authorization & Management Integration Tests', () => {
  let studentUser: any;
  let studentToken: string;

  let adminUser1: any;
  let adminToken1: string;

  let adminUser2: any;
  let adminToken2: string;

  beforeAll(async () => {
    const pwdHash = await hashPassword('SecureTestPassword123!');

    // Create a regular student user
    studentUser = await prisma.user.create({
      data: {
        name: 'Normal Student',
        email: `student_test_${Date.now()}@example.com`,
        passwordHash: pwdHash,
        role: Role.USER,
      },
    });
    studentToken = generateToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
    });

    // Create Admin 1
    adminUser1 = await prisma.user.create({
      data: {
        name: 'Lead Admin',
        email: `admin1_test_${Date.now()}@example.com`,
        passwordHash: pwdHash,
        role: Role.ADMIN,
      },
    });
    adminToken1 = generateToken({
      userId: adminUser1.id,
      email: adminUser1.email,
      role: adminUser1.role,
    });

    // Create Admin 2
    adminUser2 = await prisma.user.create({
      data: {
        name: 'Second Admin',
        email: `admin2_test_${Date.now()}@example.com`,
        passwordHash: pwdHash,
        role: Role.ADMIN,
      },
    });
    adminToken2 = generateToken({
      userId: adminUser2.id,
      email: adminUser2.email,
      role: adminUser2.role,
    });
  });

  afterAll(async () => {
    // Cleanup created test users
    await prisma.user.deleteMany({
      where: {
        id: { in: [studentUser.id, adminUser1.id, adminUser2.id] },
      },
    });
    await prisma.$disconnect();
  });

  describe('Security & Authorization Barrier', () => {
    it('GET /api/admin/overview without token should return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/admin/overview with normal USER token should return 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden. Admin access required');
    });

    it('GET /api/admin/users with normal USER token should return 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /api/admin/users/:userId/role with normal USER token should return 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${studentUser.id}/role`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ role: Role.ADMIN });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/admin/overview with valid ADMIN token should return 200 OK with real DB metrics', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(3);
      expect(typeof res.body.data.totalProjects).toBe('number');
      expect(typeof res.body.data.totalMaterials).toBe('number');
      expect(typeof res.body.data.completedQuizzes).toBe('number');
      expect(typeof res.body.data.tutorInteractions).toBe('number');
      expect(res.body.data.materialBreakdown).toBeDefined();
    });
  });

  describe('Data Privacy Audit', () => {
    it('GET /api/admin/users should NEVER expose passwordHash or credentials', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);

      for (const u of res.body.data.users) {
        expect((u as any).passwordHash).toBeUndefined();
        expect((u as any).password).toBeUndefined();
        expect((u as any).token).toBeUndefined();
      }
    });
  });

  describe('Admin Role Management Safety Rules', () => {
    it('Admin cannot demote their own account (should return 400)', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser1.id}/role`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ role: Role.USER });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('cannot demote their own account');
    });

    it('Admin can promote a USER to ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${studentUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ role: Role.ADMIN });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(Role.ADMIN);

      // Verify in DB
      const freshUser = await prisma.user.findUnique({ where: { id: studentUser.id } });
      expect(freshUser?.role).toBe(Role.ADMIN);
    });

    it('Admin can demote ADMIN to USER when other administrators exist', async () => {
      // studentUser is now an ADMIN (making 3 admins: adminUser1, adminUser2, studentUser)
      const res = await request(app)
        .patch(`/api/admin/users/${studentUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ role: Role.USER });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(Role.USER);

      const freshUser = await prisma.user.findUnique({ where: { id: studentUser.id } });
      expect(freshUser?.role).toBe(Role.USER);
    });

    it('Last remaining admin cannot be demoted (should return 400)', async () => {
      // Find all current admins
      const currentAdmins = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });
      // Keep only adminUser1 as ADMIN, temporarily set others to USER
      const others = currentAdmins.filter((a) => a.id !== adminUser1.id);
      for (const o of others) {
        await prisma.user.update({ where: { id: o.id }, data: { role: Role.USER } });
      }

      try {
        const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
        expect(adminCount).toBe(1);

        // Attempting to demote the sole admin using an external admin token
        const callerToken = generateToken({
          userId: 'external-admin-caller-id',
          email: 'external_admin@test.com',
          role: 'ADMIN',
        });

        const resLast = await request(app)
          .patch(`/api/admin/users/${adminUser1.id}/role`)
          .set('Authorization', `Bearer ${callerToken}`)
          .send({ role: Role.USER });

        expect(resLast.status).toBe(400);
        expect(resLast.body.error).toContain('Cannot demote the last remaining administrator');
      } finally {
        // Restore all previous admins
        for (const o of others) {
          await prisma.user.update({ where: { id: o.id }, data: { role: Role.ADMIN } });
        }
      }
    });
  });

  describe('Admin Monitoring & Aggregation Endpoints', () => {
    it('GET /api/admin/projects returns project list and counts', async () => {
      const res = await request(app)
        .get('/api/admin/projects')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
      expect(res.body.data.stats).toBeDefined();
    });

    it('GET /api/admin/materials returns materials and processing stats', async () => {
      const res = await request(app)
        .get('/api/admin/materials')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.materials)).toBe(true);
      expect(res.body.data.stats.totalMaterials).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/admin/quizzes returns quizzes and score aggregations', async () => {
      const res = await request(app)
        .get('/api/admin/quizzes')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.quizzes)).toBe(true);
      expect(res.body.data.stats.totalGenerated).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/admin/tutor returns tutor metrics without exposing private message texts', async () => {
      const res = await request(app)
        .get('/api/admin/tutor')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.totalInteractions).toBeGreaterThanOrEqual(0);
      for (const act of res.body.data.recentActivity) {
        expect((act as any).content).toBeUndefined(); // Private content not leaked
      }
    });

    it('GET /api/admin/health returns real system health components', async () => {
      const res = await request(app)
        .get('/api/admin/health')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.components.backend.status).toBe('healthy');
      expect(res.body.data.components.database.status).toBe('healthy');
      expect(typeof res.body.data.components.database.latencyMs).toBe('number');
      expect(res.body.data.components.aiService).toBeDefined();
      expect(res.body.data.components.backgroundWorker).toBeDefined();
    });
  });
});
