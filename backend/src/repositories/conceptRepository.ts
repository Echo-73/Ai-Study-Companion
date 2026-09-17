import { prisma } from '../config/prisma';
import { Concept, MasteryRecord, MasteryStatus } from '@prisma/client';

export class ConceptRepository {
  async getProjectConcepts(projectId: string): Promise<(Concept & { masteryRecords: MasteryRecord[] })[]> {
    return prisma.concept.findMany({
      where: { projectId },
      include: {
        masteryRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getConceptWithMastery(conceptId: string): Promise<(Concept & { masteryRecords: MasteryRecord[] }) | null> {
    return prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        masteryRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}

export const conceptRepository = new ConceptRepository();
