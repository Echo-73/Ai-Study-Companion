import { materialRepository } from '../repositories/materialRepository';
import { embeddingService } from './embeddingService';
import { cosineSimilarity } from '../utils/vectorMath';

export interface RetrievedChunk {
  chunkId: string;
  materialId: string;
  materialTitle: string;
  pageNumber: number;
  content: string;
  similarityScore: number;
}

export class RetrievalService {
  async retrieveProjectChunks(
    projectId: string,
    query: string,
    topK: number = 4
  ): Promise<{ chunks: RetrievedChunk[]; maxSimilarity: number }> {
    const queryVector = await embeddingService.generateEmbedding(query);

    const dbChunks = await materialRepository.getChunksByProjectId(projectId);
    if (dbChunks.length === 0) {
      return { chunks: [], maxSimilarity: 0 };
    }

    const materials = await materialRepository.findByProjectId(projectId);
    const titleMap = new Map<string, string>();
    materials.forEach((m) => titleMap.set(m.id, m.title));

    const scoredChunks: RetrievedChunk[] = [];
    let maxSimilarity = 0;

    for (const chunk of dbChunks) {
      let chunkVector: number[] = [];
      if (Array.isArray(chunk.embedding)) {
        chunkVector = chunk.embedding as number[];
      } else if (typeof chunk.embedding === 'string') {
        try {
          chunkVector = JSON.parse(chunk.embedding);
        } catch (_) {}
      }

      const score = cosineSimilarity(queryVector, chunkVector);

      if (score > maxSimilarity) {
        maxSimilarity = score;
      }

      scoredChunks.push({
        chunkId: chunk.id,
        materialId: chunk.materialId,
        materialTitle: titleMap.get(chunk.materialId) || 'Learning Material',
        pageNumber: chunk.pageNumber,
        content: chunk.content,
        similarityScore: Math.round(score * 1000) / 1000,
      });
    }

    scoredChunks.sort((a, b) => b.similarityScore - a.similarityScore);
    const selectedChunks = scoredChunks.slice(0, topK);

    return { chunks: selectedChunks, maxSimilarity };
  }
}

export const retrievalService = new RetrievalService();
