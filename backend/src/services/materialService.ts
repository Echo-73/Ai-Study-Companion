import { materialRepository } from '../repositories/materialRepository';
import { backgroundJobService } from './backgroundJobService';
import { pdfProcessor } from './pdfProcessor';
import { chunkPageTexts } from '../utils/chunker';
import { embeddingService } from './embeddingService';
import { learningEventRepository } from '../repositories/learningEventRepository';
import { storageService } from './storageService';
import { prisma } from '../config/prisma';
import { ProcessingStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export class MaterialService {
  constructor() {
    backgroundJobService.registerHandler('PROCESS_MATERIAL', this.processMaterialJob.bind(this));
  }

  async uploadAndEnqueue(data: {
    userId: string;
    projectId: string;
    title: string;
    fileUrl?: string;
    filePath?: string;
  }) {
    const fileRef = data.fileUrl || data.filePath || null;

    const material = await materialRepository.create({
      projectId: data.projectId,
      title: data.title,
      fileUrl: fileRef,
    });

    await learningEventRepository.record({
      userId: data.userId,
      projectId: data.projectId,
      eventType: 'MATERIAL_UPLOADED',
      metadata: { materialId: material.id, title: material.title },
    });

    const payloadRecord: Record<string, any> = {
      materialId: material.id,
      projectId: data.projectId,
      fileUrl: fileRef,
      filePath: fileRef, // preserve for backward compatibility
      userId: data.userId,
    };

    const job = await backgroundJobService.enqueueJob(
      'PROCESS_MATERIAL',
      payloadRecord,
      `process-material-${material.id}`
    );

    return { material, jobId: job.id };
  }

  async processMaterialJob(payload: {
    materialId: string;
    projectId: string;
    fileUrl?: string | null;
    filePath?: string | null;
    userId: string;
  }): Promise<void> {
    const { materialId, projectId, userId } = payload;
    const fileRef = payload.fileUrl || payload.filePath;
    logger.info(`Starting background processing for material ${materialId}`);

    await materialRepository.updateStatus(materialId, ProcessingStatus.PROCESSING);

    try {
      await learningEventRepository.record({
        userId,
        projectId,
        eventType: 'MATERIAL_PROCESSING_STARTED',
        metadata: { materialId },
      });
    } catch (e: any) {
      logger.warn(`Could not log MATERIAL_PROCESSING_STARTED event for ${materialId}:`, e.message);
    }

    try {
      let pages = [];
      let pageCount = 1;

      if (fileRef) {
        const buffer = await storageService.getFileBuffer(fileRef);
        const result = await pdfProcessor.extractText(buffer);
        pages = result.pages;
        pageCount = result.pageCount;
      } else {
        pages = [{ pageNumber: 1, text: `Material content for ${materialId}` }];
      }

      const chunks = chunkPageTexts(pages, 500, 100);

      const chunksWithEmbeddings = [];
      for (const chunk of chunks) {
        const vector = await embeddingService.generateEmbedding(chunk.content);
        chunksWithEmbeddings.push({
          materialId,
          projectId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          tokenCount: chunk.tokenCount,
          embedding: vector,
        });
      }

      await materialRepository.saveChunks(chunksWithEmbeddings);

      // Do not extract arbitrary words via regex; concept discovery is driven by quiz questions and verified curriculum topics.

      await materialRepository.updateStatus(materialId, ProcessingStatus.READY, pageCount);
      try {
        await learningEventRepository.record({
          userId,
          projectId,
          eventType: 'MATERIAL_PROCESSING_COMPLETED',
          metadata: { materialId, totalChunks: chunks.length, pageCount },
        });
      } catch (e: any) {
        logger.warn(`Could not log MATERIAL_PROCESSING_COMPLETED event for ${materialId}:`, e.message);
      }

      logger.info(`Material ${materialId} processed successfully (${chunks.length} chunks).`);
    } catch (error: any) {
      logger.error(`Failed to process material ${materialId}:`, error);

      await materialRepository.updateStatus(
        materialId,
        ProcessingStatus.FAILED,
        0,
        error.message || 'Processing failed'
      );

      try {
        await learningEventRepository.record({
          userId,
          projectId,
          eventType: 'MATERIAL_PROCESSING_FAILED',
          metadata: { materialId, error: error.message },
        });
      } catch (e: any) {
        logger.warn(`Could not log MATERIAL_PROCESSING_FAILED event for ${materialId}:`, e.message);
      }

      throw error;
    }
  }



  async getMaterialStatus(materialId: string) {
    const material = await materialRepository.findById(materialId);
    if (!material) {
      throw new AppError('Material not found', 404);
    }
    return material;
  }

  async getProjectMaterials(projectId: string) {
    return materialRepository.findByProjectId(projectId);
  }
}

export const materialService = new MaterialService();
