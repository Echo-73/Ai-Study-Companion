import { embeddingService } from './src/services/embeddingService';
import { cosineSimilarity } from './src/utils/vectorMath';

async function testEmbeddings() {
  const query = "What is gradient descent?";
  const chunk = "Gradient descent is a first-order iterative optimization algorithm for finding a local minimum of a differentiable function. To find a local minimum of a function using gradient descent, one takes steps proportional to the negative of the gradient (or approximate gradient) of the function at the current point. If, instead, one takes steps proportional to the positive of the gradient, one approaches a local maximum of that function; the procedure is then known as gradient ascent. Gradient descent was originally proposed by Cauchy in 1847. It is widely used in machine learning for training neural networks and other models.";

  const queryVec = await embeddingService.generateEmbedding(query);
  const chunkVec = await embeddingService.generateEmbedding(chunk);

  const score = cosineSimilarity(queryVec, chunkVec);
  console.log(`Query: "${query}"`);
  console.log(`Chunk length: ${chunk.split(' ').length} words`);
  console.log(`Similarity Score: ${score}`);
}

testEmbeddings().catch(console.error);
