import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

export interface LLMResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private currentKey: string | null = null;
  private getModelName(): string {
    return process.env.GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-3.6-flash';
  }

  private getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
  }

  private isKeyConfigured(key?: string): boolean {
    if (!key) return false;
    const trimmed = key.trim();
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith('mock') &&
      trimmed !== 'your-gemini-api-key-here'
    );
  }

  private getGenAI(): GoogleGenerativeAI | null {
    if ((process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') && process.env.TEST_LIVE_AI !== 'true') {
      return null;
    }

    const key = this.getApiKey();
    const isConfigured = this.isKeyConfigured(key);

    if (!isConfigured) {
      throw new AppError(
        'AI API key is not configured. Please set GEMINI_API_KEY in backend/.env',
        500
      );
    }

    if (!this.genAI || this.currentKey !== key) {
      this.genAI = new GoogleGenerativeAI(key!);
      this.currentKey = key!;
    }

    return this.genAI;
  }

  async generateResponse(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();
    const genAI = this.getGenAI();
    const modelName = this.getModelName();

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
        });

        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        const text = response.text();

        if (!text) {
          throw new AppError('AI provider returned an empty response.', 502);
        }

        const latencyMs = Date.now() - startTime;

        return {
          content: text,
          model: modelName,
          promptTokens: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
          completionTokens: Math.ceil(text.length / 4),
          latencyMs,
        };
      } catch (error: any) {
        logger.error('Gemini API call failed:', error);
        if (error instanceof AppError) {
          throw error;
        }

        let statusCode = 502;
        if (typeof error.status === 'number' && error.status >= 400 && error.status <= 599) {
          statusCode = error.status;
        } else if (error.message?.includes('404')) {
          statusCode = 404;
        } else if (error.message?.includes('401') || error.message?.includes('API_KEY_INVALID')) {
          statusCode = 401;
        } else if (error.message?.includes('403')) {
          statusCode = 403;
        } else if (error.message?.includes('429')) {
          statusCode = 429;
        } else if (error.message?.includes('400')) {
          statusCode = 400;
        } else if (error.message?.includes('500')) {
          statusCode = 500;
        }

        throw new AppError(`Gemini AI Error: ${error.message || 'Failed to generate response'}`, statusCode);
      }
    }

    // In test environment only: deterministic fallback to satisfy offline integration tests
    const latencyMs = Date.now() - startTime;
    return {
      content: this.generateFallbackAnswer(systemPrompt, userPrompt),
      model: 'mock-gemini-flash',
      promptTokens: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
      completionTokens: 50,
      latencyMs,
    };
  }

  private generateFallbackAnswer(systemPrompt: string, userPrompt: string): string {
    if (systemPrompt.includes('insufficient evidence') || userPrompt.includes('UNSUPPORTED_CONTEXT')) {
      return 'Based strictly on your project materials, I do not have sufficient evidence or information to answer this question accurately.';
    }

    return `Based on your project learning material: The core concept explains key principles relevant to your study goal. Refer to the provided source citations for full details.`;
  }
}

export const aiService = new AIService();

