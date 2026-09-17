import { prisma } from './src/config/prisma';
import request from 'supertest';
import { app } from './src/app';
import { hashPassword, generateToken } from './src/utils/authUtils';
import { embeddingService } from './src/services/embeddingService';

async function testFlow() {
  console.log('=== TESTING AI TUTOR END-TO-END FLOW ===\n');

  // 1. Setup user & token
  const pwd = await hashPassword('testpass123');
  const user = await prisma.user.create({
    data: {
      name: 'Binary Tree Student',
      email: `student_${Date.now()}@test.com`,
      passwordHash: pwd,
    },
  });
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  // 2. Setup space & project
  const space = await prisma.space.create({
    data: { name: 'Computer Science Space', userId: user.id },
  });

  const project = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: 'Data Structures 101',
      learningGoal: 'Master Trees and Graphs',
    },
  });

  console.log(`[SETUP]: Created User (${user.id}), Space (${space.id}), Project (${project.id})`);

  // 3. Test Empty Question Validation (400)
  const emptyRes = await request(app)
    .post(`/api/projects/${project.id}/tutor/chat`)
    .set('Authorization', `Bearer ${token}`)
    .send({ question: '   ' });

  console.log(`[TEST 1 - Empty Input Validation]: Status ${emptyRes.status} (Expected 400), Error: "${emptyRes.body.error}"`);
  if (emptyRes.status !== 400 || emptyRes.body.error !== 'Question text is required.') {
    throw new Error('Empty question validation failed');
  }

  // 4. Test Unsupported Question Before Uploading Material
  const unsupportedBeforeRes = await request(app)
    .post(`/api/projects/${project.id}/tutor/chat`)
    .set('Authorization', `Bearer ${token}`)
    .send({ question: 'What is a binary tree?' });

  console.log(`[TEST 2 - No Materials in Project]: Status ${unsupportedBeforeRes.status}, isSupported: ${unsupportedBeforeRes.body.data?.isSupported}`);
  console.log(`         Answer text: "${unsupportedBeforeRes.body.data?.answer?.slice(0, 65)}..."`);
  console.log(`         Root response text: "${unsupportedBeforeRes.body.response?.slice(0, 65)}..."`);
  if (!unsupportedBeforeRes.body.data?.answer) throw new Error('data.answer is missing in response!');
  if (!unsupportedBeforeRes.body.response) throw new Error('root response is missing in response!');
  if (unsupportedBeforeRes.body.data?.isSupported !== false) throw new Error('Should be unsupported when no materials exist!');

  // 5. Upload Material & Seed Chunks for "What is a binary tree?"
  const material = await prisma.material.create({
    data: {
      projectId: project.id,
      title: 'Data_Structures_Textbook.pdf',
      status: 'READY',
      pageCount: 45,
    },
  });

  const chunkContent = 'A binary tree is a hierarchical data structure in which each node has at most two children, referred to as the left child and the right child. The top node is the root of the tree. Binary trees are foundational in computer science for binary search trees (BST), heaps, and syntax trees.';
  const vector = await embeddingService.generateEmbedding(chunkContent);

  await prisma.materialChunk.create({
    data: {
      projectId: project.id,
      materialId: material.id,
      chunkIndex: 0,
      content: chunkContent,
      pageNumber: 22,
      tokenCount: 48,
      embedding: vector as any,
    },
  });

  console.log(`\n[SETUP]: Seeded material chunk on Binary Trees (Pg. 22)`);

  // 6. Test Supported Question When API Key is missing/mock (Graceful 500 error reporting)
  const unconfiguredKeyRes = await request(app)
    .post(`/api/projects/${project.id}/tutor/chat`)
    .set('Authorization', `Bearer ${token}`)
    .send({ question: 'What is a binary tree?' });

  console.log(`[TEST 3 - Missing API Key Detection]: Status ${unconfiguredKeyRes.status} (Expected 500)`);
  console.log(`         Error: "${unconfiguredKeyRes.body.error}"`);
  if (unconfiguredKeyRes.status !== 500 || !unconfiguredKeyRes.body.error.includes('AI API key is not configured')) {
    throw new Error('Did not return expected unconfigured API key error!');
  }

  // 7. Now simulate test environment to verify response format when AI responds
  process.env.NODE_ENV = 'test';
  const supportedRes = await request(app)
    .post(`/api/projects/${project.id}/tutor/chat`)
    .set('Authorization', `Bearer ${token}`)
    .send({ question: 'What is a binary tree?' });

  console.log(`\n[TEST 4 - Supported Question with AI Response]: Status ${supportedRes.status}`);
  console.log(`         Success: ${supportedRes.body.success}`);
  console.log(`         isSupported: ${supportedRes.body.data?.isSupported}`);
  console.log(`         Answer (data.answer): "${supportedRes.body.data?.answer}"`);
  console.log(`         Response (root response): "${supportedRes.body.response}"`);
  console.log(`         Message Content: "${supportedRes.body.data?.message?.content}"`);
  console.log(`         Citations count: ${supportedRes.body.data?.citations?.length}`);
  if (supportedRes.body.data?.citations?.length > 0) {
    console.log(`         First Citation: "${supportedRes.body.data.citations[0].materialTitle}" (Pg. ${supportedRes.body.data.citations[0].pageNumber})`);
  }

  if (!supportedRes.body.data?.answer) throw new Error('data.answer is missing in supported response!');
  if (supportedRes.body.data.isSupported !== true) throw new Error('Question should be supported!');

  // 8. Test Fetching Conversations & Messages
  const convListRes = await request(app)
    .get(`/api/projects/${project.id}/tutor/conversations`)
    .set('Authorization', `Bearer ${token}`);

  console.log(`\n[TEST 5 - Fetch Conversations]: Status ${convListRes.status}, Count: ${convListRes.body.data?.length}`);
  const convId = convListRes.body.data[0].id;

  const messagesRes = await request(app)
    .get(`/api/projects/${project.id}/tutor/conversations/${convId}`)
    .set('Authorization', `Bearer ${token}`);

  console.log(`[TEST 6 - Fetch Messages]: Status ${messagesRes.status}, Message count: ${messagesRes.body.data?.length}`);
  console.log(`         Messages is Array: ${Array.isArray(messagesRes.body.data)}`);
  if (!Array.isArray(messagesRes.body.data) || messagesRes.body.data.length === 0) {
    throw new Error('Messages list is invalid or empty!');
  }

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
  console.log('\n=== ALL 6 E2E TUTOR TESTS PASSED WITH 100% SUCCESS ===');
}

testFlow()
  .catch((err) => {
    console.error('Test Flow Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
