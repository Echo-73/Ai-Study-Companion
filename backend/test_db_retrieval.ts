import { PrismaClient } from '@prisma/client';
import { retrievalService } from './src/services/retrievalService';

const prisma = new PrismaClient();

async function inspectDb() {
  const chunks = await prisma.materialChunk.findMany({ take: 5 });
  console.log(`Found ${chunks.length} chunks in DB.`);

  if (chunks.length > 0) {
    const chunk = chunks[0];
    console.log(`Chunk 0 materialId: ${chunk.materialId}, projectId: ${chunk.projectId}`);
    console.log(`Chunk 0 content preview: ${chunk.content.slice(0, 100)}...`);
    console.log(`Chunk 0 embedding type: ${typeof chunk.embedding}, isArray: ${Array.isArray(chunk.embedding)}`);
    if (Array.isArray(chunk.embedding)) {
      console.log(`Chunk 0 embedding length: ${chunk.embedding.length}`);
    }

    // Now test retrieval
    const retrieval = await retrievalService.retrieveProjectChunks(chunk.projectId, "gradient descent");
    console.log(`Retrieval maxSimilarity: ${retrieval.maxSimilarity}`);
    console.log(`Retrieved chunks: ${retrieval.chunks.length}`);
    if (retrieval.chunks.length > 0) {
       console.log(`Best match score: ${retrieval.chunks[0].similarityScore}`);
    }
  } else {
    console.log('No chunks found! Material processing must have failed.');
  }
}

inspectDb().catch(console.error).finally(() => prisma.$disconnect());
