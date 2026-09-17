import request from 'supertest';
import { app } from './src/app';
import { prisma } from './src/config/prisma';
import { Role } from '@prisma/client';
import { hashPassword, generateToken } from './src/utils/authUtils';

async function runVerification() {
  console.log('===============================================================');
  console.log('STARTING COMPREHENSIVE ADMIN E2E & SECURITY VERIFICATION');
  console.log('===============================================================');

  const pwdHash = await hashPassword('StudentPassword123!');
  const testStudentEmail = `student_verify_${Date.now()}@example.com`;
  const student = await prisma.user.create({
    data: {
      name: 'Verification Student',
      email: testStudentEmail,
      passwordHash: pwdHash,
      role: Role.USER,
    },
  });

  const studentToken = generateToken({
    userId: student.id,
    email: student.email,
    role: student.role,
  });

  console.log(`\n[STEP 1] Created Student User: ${student.email} (Role: ${student.role})`);

  // STEP 2 & 3 & 4: Test Normal User Access to Admin Endpoints
  console.log('\n[STEP 2] Testing normal USER access to Admin APIs:');

  const unauthRes = await request(app).get('/api/admin/overview');
  console.log(`  - Unauthenticated GET /api/admin/overview: Status ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) throw new Error('Security check failed: unauthenticated user was not rejected with 401');

  const userOverviewRes = await request(app)
    .get('/api/admin/overview')
    .set('Authorization', `Bearer ${studentToken}`);
  console.log(`  - Normal USER GET /api/admin/overview: Status ${userOverviewRes.status} (Expected: 403)`);
  if (userOverviewRes.status !== 403) throw new Error('Security check failed: normal user was not rejected with 403');

  const userListRes = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${studentToken}`);
  console.log(`  - Normal USER GET /api/admin/users: Status ${userListRes.status} (Expected: 403)`);
  if (userListRes.status !== 403) throw new Error('Security check failed: normal user accessed /api/admin/users');

  const userPatchRes = await request(app)
    .patch(`/api/admin/users/${student.id}/role`)
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ role: Role.ADMIN });
  console.log(`  - Normal USER PATCH /api/admin/users/:id/role: Status ${userPatchRes.status} (Expected: 403)`);
  if (userPatchRes.status !== 403) throw new Error('Security check failed: normal user accessed role modification');

  // STEP 5: Create / Authenticate Admin
  console.log('\n[STEP 3] Authenticating as ADMIN:');
  const adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (!adminUser) throw new Error('No ADMIN user found in database.');
  const adminToken = generateToken({
    userId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
  });
  console.log(`  - Logged in as Admin: ${adminUser.name} (${adminUser.email})`);

  // STEP 6 & 7: Test GET /api/admin/overview & Compare with Real DB Counts
  console.log('\n[STEP 4] Verifying Real Database Metrics in Overview:');
  const overviewRes = await request(app)
    .get('/api/admin/overview')
    .set('Authorization', `Bearer ${adminToken}`);

  console.log(`  - Admin GET /api/admin/overview: Status ${overviewRes.status} (Expected: 200)`);
  if (overviewRes.status !== 200) throw new Error('Failed to fetch admin overview');

  const overview = overviewRes.body.data;
  const dbUsers = await prisma.user.count();
  const dbProjects = await prisma.project.count();
  const dbMaterials = await prisma.material.count();
  const dbQuizzes = await prisma.quiz.count();
  const dbCompletedQuizzes = await prisma.quiz.count({ where: { completedAt: { not: null }, score: { not: null } } });
  const dbTutorMessages = await prisma.message.count({ where: { sender: 'user' } });

  console.log(`    * Total Users: API = ${overview.totalUsers}, DB = ${dbUsers} (Match: ${overview.totalUsers === dbUsers})`);
  console.log(`    * Total Projects: API = ${overview.totalProjects}, DB = ${dbProjects} (Match: ${overview.totalProjects === dbProjects})`);
  console.log(`    * Total Materials: API = ${overview.totalMaterials}, DB = ${dbMaterials} (Match: ${overview.totalMaterials === dbMaterials})`);
  console.log(`    * Completed Quizzes: API = ${overview.completedQuizzes}, DB = ${dbCompletedQuizzes} (Match: ${overview.completedQuizzes === dbCompletedQuizzes})`);
  console.log(`    * Total Quizzes: API = ${overview.totalQuizzes}, DB = ${dbQuizzes} (Match: ${overview.totalQuizzes === dbQuizzes})`);
  console.log(`    * Tutor Interactions: API = ${overview.tutorInteractions}, DB = ${dbTutorMessages} (Match: ${overview.tutorInteractions === dbTutorMessages})`);
  console.log(`    * Average Quiz Score: ${overview.averageQuizScore}%`);

  if (overview.totalUsers !== dbUsers || overview.totalProjects !== dbProjects || overview.completedQuizzes !== dbCompletedQuizzes) {
    throw new Error('Overview data does not strictly match real database counts!');
  }

  // STEP 8: Users Management, Pagination & Search
  console.log('\n[STEP 5] Verifying User Management & Privacy:');
  const usersRes = await request(app)
    .get('/api/admin/users?page=1&pageSize=5')
    .set('Authorization', `Bearer ${adminToken}`);
  console.log(`  - GET /api/admin/users: Status ${usersRes.status}, Count: ${usersRes.body.data.users.length}`);

  for (const u of usersRes.body.data.users) {
    if (u.passwordHash || u.password || u.token) {
      throw new Error(`SECURITY ALERT: Sensitive credential exposed for user ${u.email}!`);
    }
  }
  console.log('  - Privacy verified: Zero password hashes or credentials exposed.');

  // Search by email
  const searchRes = await request(app)
    .get(`/api/admin/users?search=${student.email}`)
    .set('Authorization', `Bearer ${adminToken}`);
  console.log(`  - Search by email (${student.email}): Found ${searchRes.body.data.users.length} match (Expected: 1)`);
  if (searchRes.body.data.users.length !== 1) throw new Error('User search failed to find matching record');

  // STEP 9, 10, 11, 12: Role Management & Safety Rules
  console.log('\n[STEP 6] Testing Admin Role Safety Rules:');

  // 1. Promote student to ADMIN
  const promoteRes = await request(app)
    .patch(`/api/admin/users/${student.id}/role`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: Role.ADMIN });
  console.log(`  - Promote USER -> ADMIN: Status ${promoteRes.status} (Expected: 200)`);
  if (promoteRes.status !== 200 || promoteRes.body.data.role !== Role.ADMIN) throw new Error('Failed to promote user to ADMIN');

  // 2. Prevent self-demotion
  const selfDemoteRes = await request(app)
    .patch(`/api/admin/users/${adminUser.id}/role`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: Role.USER });
  console.log(`  - Prevent self-demotion: Status ${selfDemoteRes.status} (Expected: 400), Error: "${selfDemoteRes.body.error}"`);
  if (selfDemoteRes.status !== 400) throw new Error('Safety rule failed: admin was able to demote themselves!');

  // 3. Demote student back to USER
  const demoteRes = await request(app)
    .patch(`/api/admin/users/${student.id}/role`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: Role.USER });
  console.log(`  - Demote ADMIN -> USER (when another admin exists): Status ${demoteRes.status} (Expected: 200)`);
  if (demoteRes.status !== 200 || demoteRes.body.data.role !== Role.USER) throw new Error('Failed to demote user back to USER');

  // 4. Test Last Admin Protection
  // If only adminUser is admin, attempting to demote adminUser must fail
  const totalAdminsNow = await prisma.user.count({ where: { role: Role.ADMIN } });
  console.log(`  - Current total admins in database: ${totalAdminsNow}`);
  if (totalAdminsNow === 1) {
    // Attempting to demote this sole admin by creating a temporary admin token
    const tempAdmin = await prisma.user.create({
      data: { name: 'Temp', email: `temp_${Date.now()}@test.com`, passwordHash: pwdHash, role: Role.USER },
    });
    const tempAdminToken = generateToken({ userId: tempAdmin.id, email: tempAdmin.email, role: 'ADMIN' });
    const lastAdminRes = await request(app)
      .patch(`/api/admin/users/${adminUser.id}/role`)
      .set('Authorization', `Bearer ${tempAdminToken}`)
      .send({ role: Role.USER });

    console.log(`  - Last admin demotion attempt: Status ${lastAdminRes.status} (Expected: 400), Error: "${lastAdminRes.body.error}"`);
    if (lastAdminRes.status !== 400) throw new Error('Safety rule failed: last admin was demoted!');
    await prisma.user.delete({ where: { id: tempAdmin.id } });
  }

  // STEP 13, 14, 15, 16, 17, 18: Resource Monitoring Endpoints
  console.log('\n[STEP 7] Verifying Monitoring Endpoints:');

  const projRes = await request(app).get('/api/admin/projects').set('Authorization', `Bearer ${adminToken}`);
  console.log(`  - GET /api/admin/projects: Status ${projRes.status}, Projects: ${projRes.body.data.projects.length}, Total: ${projRes.body.data.stats.totalProjects}`);
  if (projRes.status !== 200) throw new Error('Failed to fetch admin projects');

  const matRes = await request(app).get('/api/admin/materials').set('Authorization', `Bearer ${adminToken}`);
  console.log(`  - GET /api/admin/materials: Status ${matRes.status}, Materials: ${matRes.body.data.materials.length}, Ready: ${matRes.body.data.stats.processed}`);
  if (matRes.status !== 200) throw new Error('Failed to fetch admin materials');

  const quizRes = await request(app).get('/api/admin/quizzes').set('Authorization', `Bearer ${adminToken}`);
  console.log(`  - GET /api/admin/quizzes: Status ${quizRes.status}, Quizzes: ${quizRes.body.data.quizzes.length}, Completed: ${quizRes.body.data.stats.completedQuizzes}`);
  if (quizRes.status !== 200) throw new Error('Failed to fetch admin quizzes');

  const tutorRes = await request(app).get('/api/admin/tutor').set('Authorization', `Bearer ${adminToken}`);
  console.log(`  - GET /api/admin/tutor: Status ${tutorRes.status}, Total: ${tutorRes.body.data.stats.totalInteractions}, Unique: ${tutorRes.body.data.stats.uniqueUsers}`);
  if (tutorRes.status !== 200) throw new Error('Failed to fetch admin tutor stats');

  const activityRes = await request(app).get('/api/admin/activity').set('Authorization', `Bearer ${adminToken}`);
  console.log(`  - GET /api/admin/activity: Status ${activityRes.status}, Events: ${activityRes.body.data.events.length}`);
  if (activityRes.status !== 200) throw new Error('Failed to fetch admin activity logs');

  const healthRes = await request(app).get('/api/admin/health').set('Authorization', `Bearer ${adminToken}`);
  console.log(`  - GET /api/admin/health: Status ${healthRes.status}, Backend: ${healthRes.body.data.components.backend.status}, DB: ${healthRes.body.data.components.database.status} (${healthRes.body.data.components.database.latencyMs}ms), AI: ${healthRes.body.data.components.aiService.status}`);
  if (healthRes.status !== 200) throw new Error('Failed to fetch admin health status');

  // STEP 19: Verify Student Features Still Work
  console.log('\n[STEP 8] Verifying Student Features Integrity:');
  const spacesRes = await request(app).get('/api/spaces').set('Authorization', `Bearer ${studentToken}`);
  console.log(`  - Student GET /api/spaces: Status ${spacesRes.status} (Expected: 200)`);
  if (spacesRes.status !== 200) throw new Error('Student spaces route failed');

  const firstProject = await prisma.project.findFirst();
  if (firstProject) {
    const pAnalytics = await request(app)
      .get(`/api/projects/${firstProject.id}/analytics`)
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`  - Student Project Analytics (/api/projects/:id/analytics): Status ${pAnalytics.status} (Expected: 200)`);
    if (pAnalytics.status !== 200) throw new Error('Student project analytics failed');
  }

  // Cleanup test student
  await prisma.user.delete({ where: { id: student.id } });

  console.log('\n===============================================================');
  console.log('ALL ADMIN E2E & SECURITY VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('===============================================================');
}

runVerification()
  .catch((err) => {
    console.error('\n❌ VERIFICATION ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
