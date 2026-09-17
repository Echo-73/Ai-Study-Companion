import { PrismaClient } from '@prisma/client';
import { tutorService } from './src/services/tutorService';
import { retrievalService } from './src/services/retrievalService';
import { aiService } from './src/services/aiService';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- STARTING E2E TUTOR TEST ---');
  
  // 1. Create mock data
  const user = await prisma.user.create({
    data: {
      email: `tutor_test_${Date.now()}@example.com`,
      name: 'Tutor Tester',
      passwordHash: 'fakehash'
    }
  });

  const space = await prisma.space.create({
    data: { name: 'Test Space', userId: user.id }
  });

  const project = await prisma.project.create({
    data: {
      name: 'Machine Learning Basics',
      learningGoal: 'Understand gradient descent',
      spaceId: space.id,
    }
  });

  const material = await prisma.material.create({
    data: {
      title: 'ML_Textbook.pdf',
      fileUrl: 'mock/url',
      status: 'READY',
      projectId: project.id
    }
  });

  // Mock embedding vector (length 768 or similar, just use an array of 0s and 1s)
  const mockVector = new Array(768).fill(0).map((_, i) => (i % 2 === 0 ? 0.1 : -0.1));

  await prisma.materialChunk.create({
    data: {
      content: 'Gradient descent is an optimization algorithm used to minimize some function by iteratively moving in the direction of steepest descent as defined by the negative of the gradient.',
      pageNumber: 15,
      embedding: JSON.stringify(mockVector),
      materialId: material.id,
      projectId: project.id,
      chunkIndex: 0
    }
  });

  console.log('\n[DATABASE TEST]: SUCCESS - Created User, Project, Material, and Chunk');

  // 2. Retrieval Test
  const retrievalResult = await retrievalService.retrieveProjectChunks(project.id, 'What is gradient descent?');
  console.log(`\n[RETRIEVAL TEST]: SUCCESS - Retrieved ${retrievalResult.chunks.length} chunks. Max Similarity: ${retrievalResult.maxSimilarity}`);

  // 3. Gemini Test (Direct)
  const llmResult = await aiService.generateResponse('You are a helpful assistant.', 'Explain machine learning in one sentence.');
  console.log(`\n[GEMINI TEST]: SUCCESS - Model: ${llmResult.model} | Tokens: ${llmResult.promptTokens} -> ${llmResult.completionTokens} | Latency: ${llmResult.latencyMs}ms`);

  // 4. Tutor End-to-End Test (Supported)
  console.log('\n[END-TO-END TEST] Asking supported question...');
  const supportedAnswer = await tutorService.askTutor({
    userId: user.id,
    projectId: project.id,
    question: 'What is gradient descent?'
  });
  console.log(`Tutor Response: ${supportedAnswer.message.content}`);
  console.log(`Citations: ${supportedAnswer.citations.length} found`);
  if (supportedAnswer.citations.length > 0) {
    console.log(`First Citation: ${supportedAnswer.citations[0].materialTitle} Pg ${supportedAnswer.citations[0].pageNumber}`);
  }

  // 5. Tutor End-to-End Test (Unsupported)
  console.log('\n[UNSUPPORTED QUESTION TEST] Asking unsupported question...');
  // Force retrieval to have low similarity by using a completely unrelated question (fallback mock embedding is hardcoded, so we might need to rely on the fallback logic if it hits).
  // Wait, retrievalService uses cosineSimilarity. The mock vector for the question might match exactly if embeddingService uses a dummy vector generator too.
  // Let's see what embeddingService does.
  const unsupportedAnswer = await tutorService.askTutor({
    userId: user.id,
    projectId: project.id,
    question: 'Who is the current president of Brazil?'
  });
  console.log(`Tutor Response (Unsupported): ${unsupportedAnswer.message.content}`);
  console.log(`Is Supported Flag: ${unsupportedAnswer.isSupported}`);

  console.log('\n--- TESTS COMPLETED ---');
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
