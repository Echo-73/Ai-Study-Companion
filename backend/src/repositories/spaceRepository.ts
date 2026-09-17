import { prisma } from '../config/prisma';
import { Space } from '@prisma/client';

export class SpaceRepository {
  async findByUserId(userId: string): Promise<Space[]> {
    return prisma.space.findMany({
      where: { userId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            learningGoal: true,
            updatedAt: true,
            _count: {
              select: { materials: true, concepts: true, quizzes: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Space | null> {
    return prisma.space.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            materials: { select: { id: true, title: true, status: true, pageCount: true } },
            concepts: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async create(data: { userId: string; name: string; description?: string }): Promise<Space> {
    return prisma.space.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description || null,
      },
    });
  }

  async delete(id: string): Promise<Space> {
    return prisma.space.delete({
      where: { id },
    });
  }
}

export const spaceRepository = new SpaceRepository();
