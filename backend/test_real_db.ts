import { PrismaClient } from '@prisma/client';
import { embeddingService } from './src/services/embeddingService';
import { retrievalService } from './src/services/retrievalService';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.create({ data: { email: `t${Date.now()}@test.com`, name: 't', passwordHash: 'h' } });
  const space = await prisma.space.create({ data: { name: 'S', userId: user.id } });
  const project = await prisma.project.create({ data: { name: 'P', learningGoal: 'G', spaceId: space.id } });
  const material = await prisma.material.create({ data: { title: 'M', status: 'READY', projectId: project.id } });

  const chunkText = "Machine learning is a field of artificial intelligence that uses statistical techniques to give computer systems the ability to learn from data, without being explicitly programmed. The name machine learning was coined in 1959 by Arthur Samuel.";
  const vector = await embeddingService.generateEmbedding(chunkText);

  const chunk = await prisma.materialChunk.create({
    data: {
      projectId: project.id,
      materialId: material.id,
      content: chunkText,
      pageNumber: 1,
      chunkIndex: 0,
      embedding: vector, // Passed as array, exactly like materialService.ts
    }
  });

  console.log(`Saved Chunk. embedding type: ${typeof chunk.embedding}, isArray: ${Array.isArray(chunk.embedding)}`);

  const query = "What is machine learning?";
  const retrieval = await retrievalService.retrieveProjectChunks(project.id, query);

  console.log(`Max Similarity: ${retrieval.maxSimilarity}`);
  if (retrieval.chunks.length > 0) {
    console.log(`Best Chunk Score: ${retrieval.chunks[0].similarityScore}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
