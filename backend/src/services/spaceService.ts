import { spaceRepository } from '../repositories/spaceRepository';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

export const createSpaceSchema = z.object({
  name: z.string().min(2, 'Space name must be at least 2 characters'),
  description: z.string().optional(),
});

export class SpaceService {
  async getUserSpaces(userId: string) {
    return spaceRepository.findByUserId(userId);
  }

  async getSpaceDetails(spaceId: string) {
    const space = await spaceRepository.findById(spaceId);
    if (!space) {
      throw new AppError('Space not found', 404);
    }
    return space;
  }

  async createSpace(userId: string, input: z.infer<typeof createSpaceSchema>) {
    const validated = createSpaceSchema.parse(input);
    return spaceRepository.create({
      userId,
      name: validated.name,
      description: validated.description,
    });
  }

  async deleteSpace(spaceId: string) {
    return spaceRepository.delete(spaceId);
  }
}

export const spaceService = new SpaceService();
