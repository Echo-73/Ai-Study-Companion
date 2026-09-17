import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class EmbeddingService {
  private genAI: GoogleGenerativeAI | null = null;
  private currentKey: string | null = null;
  private readonly vectorDim = 128;

  private getGenAI(): GoogleGenerativeAI | null {
    const key = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
    if (!key || key.startsWith('mock') || key === 'your-gemini-api-key-here' || process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') {
      return null;
    }
    if (!this.genAI || this.currentKey !== key) {
      this.genAI = new GoogleGenerativeAI(key);
      this.currentKey = key;
    }
    return this.genAI;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const genAI = this.getGenAI();
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text);
        if (result.embedding?.values) {
          return result.embedding.values;
        }
      } catch (err) {
        logger.warn('Gemini Embedding API call failed, falling back to deterministic embedding:', err);
      }
    }

    return this.generateDeterministicVector(text);
  }

  private generateDeterministicVector(text: string): number[] {
    const vector: number[] = new Array(this.vectorDim).fill(0);
    const stopWords = new Set(['the', 'is', 'in', 'at', 'of', 'on', 'and', 'a', 'to', 'for', 'with', 'it', 'as', 'by', 'that', 'this', 'or', 'an', 'be', 'are', 'was', 'were']);
    
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w && !stopWords.has(w));

    if (words.length === 0) return vector;

    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % this.vectorDim;
      vector[index] += 1.0;
    }

    // Normalize vector length
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vector.map((v) => Math.round((v / norm) * 10000) / 10000) : vector;
  }
}

export const embeddingService = new EmbeddingService();
