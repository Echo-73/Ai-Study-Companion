import { prisma } from '../config/prisma';
import { Prisma, Project } from '@prisma/client';

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    space: true;
    materials: true;
    concepts: {
      include: {
        masteryRecords: true;
      };
    };
    recommendations: true;
  };
}>;

export class ProjectRepository {
  async findById(id: string): Promise<ProjectWithRelations | null> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        space: true,
        materials: true,
        concepts: {
          include: {
            masteryRecords: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        recommendations: {
          where: { isDismissed: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async create(data: { spaceId: string; name: string; description?: string; learningGoal: string }): Promise<Project> {
    return prisma.project.create({
      data: {
        spaceId: data.spaceId,
        name: data.name,
        description: data.description || null,
        learningGoal: data.learningGoal,
      },
    });
  }

  async delete(id: string): Promise<Project> {
    return prisma.project.delete({
      where: { id },
    });
  }
}

export const projectRepository = new ProjectRepository();
