import { userRepository } from '../repositories/userRepository';
import { hashPassword, comparePassword, generateToken } from '../utils/authUtils';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthService {
  async register(input: z.infer<typeof registerSchema>) {
    const validated = registerSchema.parse(input);

    const existingUser = await userRepository.findByEmail(validated.email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const passwordHash = await hashPassword(validated.password);
    const user = await userRepository.create({
      name: validated.name,
      email: validated.email,
      passwordHash,
      role: validated.role,
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async login(input: z.infer<typeof loginSchema>) {
    const validated = loginSchema.parse(input);

    const user = await userRepository.findByEmail(validated.email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValidPassword = await comparePassword(validated.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
