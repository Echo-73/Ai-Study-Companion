import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';

describe('Health Check API', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/health should return 200 OK with service info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('ai-study-companion-backend');
  });

  it('Prisma database connection should be operational', async () => {
    const usersCount = await prisma.user.count();
    expect(typeof usersCount).toBe('number');
  });
});
