import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';

describe('Authentication API Integration Tests', () => {
  const testUser = {
    name: 'Alice Learner',
    email: `alice_${Date.now()}@example.com`,
    password: 'password123',
  };

  let token = '';
  let userId = '';

  afterAll(async () => {
    if (userId) {
      await prisma.user.deleteMany({ where: { email: testUser.email } });
    }
    await prisma.$disconnect();
  });

  it('POST /api/auth/register should create a new user and return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.user.passwordHash).toBeUndefined();

    token = res.body.data.token;
    userId = res.body.data.user.id;
  });

  it('POST /api/auth/register with duplicate email should return 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already exists');
  });

  it('POST /api/auth/login should authenticate existing user and return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('POST /api/auth/login with wrong password should return 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me with valid Bearer token should return user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email.toLowerCase());
  });

  it('GET /api/auth/me without Bearer token should return 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
