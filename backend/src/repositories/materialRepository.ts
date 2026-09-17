import { prisma } from '../config/prisma';
import { Material, MaterialChunk, ProcessingStatus } from '@prisma/client';

export class MaterialRepository {
  async findById(id: string): Promise<Material | null> {
    return prisma.material.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });
  }

  async findByProjectId(projectId: string): Promise<Material[]> {
    return prisma.material.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    projectId: string;
    title: string;
    fileUrl?: string | null;
    fileType?: string;
  }): Promise<Material> {
    return prisma.material.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        fileUrl: data.fileUrl || null,
        fileType: data.fileType || 'pdf',
        status: ProcessingStatus.QUEUED,
      },
    });
  }

  async updateStatus(
    id: string,
    status: ProcessingStatus,
    pageCount?: number,
    errorMessage?: string
  ): Promise<Material | null> {
    try {
      return await prisma.material.update({
        where: { id },
        data: {
          status,
          pageCount: pageCount !== undefined ? pageCount : undefined,
          errorMessage: errorMessage !== undefined ? errorMessage : undefined,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null; // Record not found, handled gracefully
      }
      throw error;
    }
  }

  async saveChunks(chunksData: Array<{
    materialId: string;
    projectId: string;
    chunkIndex: number;
    content: string;
    pageNumber: number;
    tokenCount: number;
    embedding: number[];
  }>): Promise<void> {
    await prisma.materialChunk.createMany({
      data: chunksData.map((c) => ({
        materialId: c.materialId,
        projectId: c.projectId,
        chunkIndex: c.chunkIndex,
        content: c.content,
        pageNumber: c.pageNumber,
        tokenCount: c.tokenCount,
        embedding: c.embedding as any,
      })),
    });
  }

  async getChunksByProjectId(projectId: string): Promise<MaterialChunk[]> {
    return prisma.materialChunk.findMany({
      where: { projectId },
    });
  }
}

export const materialRepository = new MaterialRepository();
