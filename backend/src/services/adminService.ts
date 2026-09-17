import { prisma } from '../config/prisma';
import { Role, ProcessingStatus, JobStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export class AdminService {
  /**
   * High-level overview metrics from the real database.
   */
  async getOverview() {
    const [
      totalUsers,
      totalProjects,
      totalMaterials,
      completedQuizzes,
      totalQuizzes,
      tutorInteractions,
      quizScoreAgg,
      materialStatusGroups,
      recentEvents,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.material.count(),
      prisma.quiz.count({ where: { completedAt: { not: null }, score: { not: null } } }),
      prisma.quiz.count(),
      prisma.message.count({ where: { sender: 'user' } }),
      prisma.quiz.aggregate({
        _avg: { score: true },
        where: { completedAt: { not: null }, score: { not: null } },
      }),
      prisma.material.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.learningEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: 8,
        include: {
          user: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: { spaces: true, learningEvents: true },
          },
        },
      }),
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          space: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: {
            select: { materials: true, quizzes: true },
          },
        },
      }),
    ]);

    const averageQuizScore =
      quizScoreAgg._avg.score !== null && quizScoreAgg._avg.score !== undefined
        ? Math.round(quizScoreAgg._avg.score * 100)
        : null;

    const materialBreakdown = {
      READY: 0,
      PROCESSING: 0,
      QUEUED: 0,
      FAILED: 0,
    };
    for (const group of materialStatusGroups) {
      if (group.status in materialBreakdown) {
        materialBreakdown[group.status as keyof typeof materialBreakdown] = group._count.id;
      }
    }

    return {
      totalUsers,
      totalProjects,
      totalMaterials,
      completedQuizzes,
      totalQuizzes,
      tutorInteractions,
      averageQuizScore,
      materialBreakdown,
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        metadata: e.metadata,
        timestamp: e.timestamp.toISOString(),
        userName: e.user.name,
        userEmail: e.user.email,
        projectName: e.project.name,
        projectId: e.project.id,
      })),
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        spacesCount: u._count.spaces,
        activityCount: u._count.learningEvents,
      })),
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        name: p.name,
        learningGoal: p.learningGoal,
        createdAt: p.createdAt.toISOString(),
        ownerName: p.space?.user?.name || 'Unknown',
        ownerEmail: p.space?.user?.email || 'Unknown',
        materialsCount: p._count.materials,
        quizzesCount: p._count.quizzes,
      })),
    };
  }

  /**
   * User Management with pagination, search, role filters, and activity detection.
   */
  async getUsers(params: PaginationParams & { role?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 10, 1), 100);
    const skip = (page - 1) * pageSize;
    const search = params.search?.trim();
    const roleFilter = params.role && params.role !== 'ALL' ? (params.role as Role) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleFilter) {
      where.role = roleFilter;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalMatching, users, newUsersCount, activeUsersCount, studentsCount, adminsCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            spaces: {
              select: {
                _count: {
                  select: { projects: true },
                },
                projects: {
                  select: {
                    _count: {
                      select: { quizzes: true, materials: true },
                    },
                  },
                },
              },
            },
            learningEvents: {
              orderBy: { timestamp: 'desc' },
              take: 1,
              select: { timestamp: true },
            },
            _count: {
              select: {
                learningEvents: true,
              },
            },
          },
        }),
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.user.count({
          where: {
            learningEvents: {
              some: { timestamp: { gte: thirtyDaysAgo } },
            },
          },
        }),
        prisma.user.count({ where: { role: Role.USER } }),
        prisma.user.count({ where: { role: Role.ADMIN } }),
      ]);

    const formattedUsers = users.map((u) => {
      let totalProjects = 0;
      let totalQuizzes = 0;

      for (const space of u.spaces) {
        totalProjects += space._count.projects;
        for (const proj of space.projects) {
          totalQuizzes += proj._count.quizzes;
        }
      }

      const lastActivityDate = u.learningEvents[0]?.timestamp || u.updatedAt || u.createdAt;
      const isActive = lastActivityDate >= thirtyDaysAgo;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        lastActivity: lastActivityDate.toISOString(),
        projectsCount: totalProjects,
        quizzesCount: totalQuizzes,
        activityCount: u._count.learningEvents,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      };
    });

    return {
      users: formattedUsers,
      pagination: {
        page,
        pageSize,
        totalRecords: totalMatching,
        totalPages: Math.ceil(totalMatching / pageSize) || 1,
      },
      stats: {
        totalUsers,
        newUsers: newUsersCount,
        activeUsers: activeUsersCount,
        students: studentsCount,
        admins: adminsCount,
      },
    };
  }

  /**
   * Role management with strict guards:
   * - Prevents admins from demoting themselves.
   * - Prevents demoting the last remaining ADMIN.
   */
  async updateUserRole(targetUserId: string, newRole: Role, requestingUserId: string) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    if (targetUserId === requestingUserId && newRole !== Role.ADMIN) {
      throw new AppError('Admins cannot demote their own account.', 400);
    }

    if (targetUser.role === Role.ADMIN && newRole !== Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN },
      });

      if (adminCount <= 1) {
        throw new AppError(
          'Cannot demote the last remaining administrator. The system must always have at least one ADMIN.',
          400
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Projects monitor with ownership and activity aggregations.
   */
  async getProjects(params: PaginationParams) {
    const page = Math.max(Number(params.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 10, 1), 100);
    const skip = (page - 1) * pageSize;
    const search = params.search?.trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { learningGoal: { contains: search, mode: 'insensitive' } },
        { space: { user: { name: { contains: search, mode: 'insensitive' } } } },
        { space: { user: { email: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [
      totalProjects,
      totalMatching,
      projectsWithMaterialsCount,
      projectsWithQuizzesCount,
      projectsWithTutorCount,
      projects,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where }),
      prisma.project.count({ where: { materials: { some: {} } } }),
      prisma.project.count({ where: { quizzes: { some: {} } } }),
      prisma.project.count({ where: { conversations: { some: { messages: { some: { sender: 'user' } } } } } }),
      prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          space: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: {
            select: {
              materials: true,
              quizzes: true,
            },
          },
          quizzes: {
            where: { completedAt: { not: null }, score: { not: null } },
            select: { score: true },
          },
          conversations: {
            select: {
              _count: {
                select: {
                  messages: { where: { sender: 'user' } },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedProjects = projects.map((p) => {
      const completedQuizzes = p.quizzes;
      const completedCount = completedQuizzes.length;
      const avgScore =
        completedCount > 0
          ? Math.round((completedQuizzes.reduce((sum, q) => sum + (q.score ?? 0), 0) / completedCount) * 100)
          : null;

      const tutorInteractions = p.conversations.reduce((sum, c) => sum + c._count.messages, 0);

      return {
        id: p.id,
        name: p.name,
        learningGoal: p.learningGoal,
        createdAt: p.createdAt.toISOString(),
        owner: {
          id: p.space?.user?.id || '',
          name: p.space?.user?.name || 'Unknown',
          email: p.space?.user?.email || 'Unknown',
        },
        materialsCount: p._count.materials,
        quizzesCount: p._count.quizzes,
        completedQuizzesCount: completedCount,
        averageScore: avgScore,
        tutorInteractionsCount: tutorInteractions,
      };
    });

    return {
      projects: formattedProjects,
      pagination: {
        page,
        pageSize,
        totalRecords: totalMatching,
        totalPages: Math.ceil(totalMatching / pageSize) || 1,
      },
      stats: {
        totalProjects,
        projectsWithMaterials: projectsWithMaterialsCount,
        projectsWithQuizzes: projectsWithQuizzesCount,
        projectsWithTutor: projectsWithTutorCount,
      },
    };
  }

  /**
   * Material pipeline monitoring with status filtering and error states.
   */
  async getMaterials(params: PaginationParams & { status?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 10, 1), 100);
    const skip = (page - 1) * pageSize;
    const search = params.search?.trim();
    const statusFilter =
      params.status && params.status !== 'ALL' ? (params.status as ProcessingStatus) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { project: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (statusFilter) {
      where.status = statusFilter;
    }

    const [
      totalMaterials,
      totalMatching,
      readyCount,
      processingCount,
      queuedCount,
      failedCount,
      materials,
    ] = await Promise.all([
      prisma.material.count(),
      prisma.material.count({ where }),
      prisma.material.count({ where: { status: ProcessingStatus.READY } }),
      prisma.material.count({ where: { status: ProcessingStatus.PROCESSING } }),
      prisma.material.count({ where: { status: ProcessingStatus.QUEUED } }),
      prisma.material.count({ where: { status: ProcessingStatus.FAILED } }),
      prisma.material.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              space: {
                select: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedMaterials = materials.map((m) => ({
      id: m.id,
      title: m.title,
      fileType: m.fileType,
      status: m.status,
      pageCount: m.pageCount,
      errorMessage: m.errorMessage,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      project: {
        id: m.project.id,
        name: m.project.name,
      },
      owner: {
        id: m.project.space?.user?.id || '',
        name: m.project.space?.user?.name || 'Unknown',
        email: m.project.space?.user?.email || 'Unknown',
      },
    }));

    return {
      materials: formattedMaterials,
      pagination: {
        page,
        pageSize,
        totalRecords: totalMatching,
        totalPages: Math.ceil(totalMatching / pageSize) || 1,
      },
      stats: {
        totalMaterials,
        processed: readyCount,
        processing: processingCount + queuedCount,
        queued: queuedCount,
        failed: failedCount,
      },
    };
  }

  /**
   * Quizzes monitoring with real score distributions and results.
   */
  async getQuizzes(params: PaginationParams & { status?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 10, 1), 100);
    const skip = (page - 1) * pageSize;
    const search = params.search?.trim();
    const status = params.status || 'ALL';

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { project: { name: { contains: search, mode: 'insensitive' } } },
        { project: { space: { user: { name: { contains: search, mode: 'insensitive' } } } } },
        { project: { space: { user: { email: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    if (status === 'COMPLETED') {
      where.completedAt = { not: null };
      where.score = { not: null };
    } else if (status === 'IN_PROGRESS') {
      where.completedAt = null;
    }

    const [totalQuizzes, totalMatching, completedCount, scoreAgg, quizzes] = await Promise.all([
      prisma.quiz.count(),
      prisma.quiz.count({ where }),
      prisma.quiz.count({ where: { completedAt: { not: null }, score: { not: null } } }),
      prisma.quiz.aggregate({
        _avg: { score: true },
        _max: { score: true },
        _min: { score: true },
        where: { completedAt: { not: null }, score: { not: null } },
      }),
      prisma.quiz.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              space: {
                select: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          _count: {
            select: { questions: true },
          },
        },
      }),
    ]);

    const formattedQuizzes = quizzes.map((q) => {
      const isCompleted = q.completedAt !== null && q.score !== null;
      const scorePct = isCompleted ? Math.round((q.score ?? 0) * 100) : null;

      return {
        id: q.id,
        title: q.title,
        score: q.score,
        scorePercentage: scorePct,
        questionCount: q._count.questions,
        completedAt: q.completedAt ? q.completedAt.toISOString() : null,
        createdAt: q.createdAt.toISOString(),
        status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        project: {
          id: q.project.id,
          name: q.project.name,
        },
        user: {
          id: q.project.space?.user?.id || '',
          name: q.project.space?.user?.name || 'Unknown',
          email: q.project.space?.user?.email || 'Unknown',
        },
      };
    });

    const avgScore =
      scoreAgg._avg.score !== null && scoreAgg._avg.score !== undefined
        ? Math.round(scoreAgg._avg.score * 100)
        : null;
    const highestScore =
      scoreAgg._max.score !== null && scoreAgg._max.score !== undefined
        ? Math.round(scoreAgg._max.score * 100)
        : null;
    const lowestScore =
      scoreAgg._min.score !== null && scoreAgg._min.score !== undefined
        ? Math.round(scoreAgg._min.score * 100)
        : null;

    return {
      quizzes: formattedQuizzes,
      pagination: {
        page,
        pageSize,
        totalRecords: totalMatching,
        totalPages: Math.ceil(totalMatching / pageSize) || 1,
      },
      stats: {
        totalGenerated: totalQuizzes,
        completedQuizzes: completedCount,
        averageScore: avgScore,
        highestScore: highestScore,
        lowestScore: lowestScore,
      },
    };
  }

  /**
   * AI Tutor Usage Statistics without leaking private conversation messages.
   */
  async getTutorStats() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalInteractions,
      questions24h,
      questions7d,
      conversations,
      recentMessages,
    ] = await Promise.all([
      prisma.message.count({ where: { sender: 'user' } }),
      prisma.message.count({ where: { sender: 'user', createdAt: { gte: oneDayAgo } } }),
      prisma.message.count({ where: { sender: 'user', createdAt: { gte: sevenDaysAgo } } }),
      prisma.conversation.findMany({
        where: {
          messages: { some: { sender: 'user' } },
        },
        select: {
          project: {
            select: {
              space: {
                select: { userId: true },
              },
            },
          },
        },
      }),
      prisma.message.findMany({
        where: { sender: 'user' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          conversation: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  space: {
                    select: {
                      user: { select: { id: true, name: true, email: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const uniqueUserIds = new Set<string>();
    for (const c of conversations) {
      if (c.project?.space?.userId) {
        uniqueUserIds.add(c.project.space.userId);
      }
    }
    const uniqueUsersCount = uniqueUserIds.size;
    const avgPerUser =
      uniqueUsersCount > 0 ? Math.round((totalInteractions / uniqueUsersCount) * 10) / 10 : 0;

    return {
      stats: {
        totalInteractions,
        uniqueUsers: uniqueUsersCount,
        questionsToday: questions24h,
        questionsWeek: questions7d,
        averageInteractionsPerUser: avgPerUser,
      },
      recentActivity: recentMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversation.id,
        timestamp: m.createdAt.toISOString(),
        isSupported: m.isSupported,
        hasCitations: Array.isArray(m.citations) && (m.citations as any[]).length > 0,
        citationsCount: Array.isArray(m.citations) ? (m.citations as any[]).length : 0,
        project: {
          id: m.conversation.project.id,
          name: m.conversation.project.name,
        },
        user: {
          id: m.conversation.project.space?.user?.id || '',
          name: m.conversation.project.space?.user?.name || 'Unknown',
          email: m.conversation.project.space?.user?.email || 'Unknown',
        },
      })),
    };
  }

  /**
   * Concept Mastery across projects reusing existing mastery schema definitions.
   */
  async getMasteryStats() {
    const concepts = await prisma.concept.findMany({
      include: {
        masteryRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        project: {
          select: {
            id: true,
            name: true,
            space: {
              select: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    let totalScore = 0;
    let scoredConceptsCount = 0;
    let strongCount = 0;
    let developingCount = 0;
    let attentionCount = 0;

    const list = concepts.map((c) => {
      const latestRecord = c.masteryRecords[0];
      const score = latestRecord?.score ?? 0;
      const scorePct = Math.round(score * 100);
      const status = latestRecord?.status || 'REQUIRES_ATTENTION';

      if (latestRecord) {
        totalScore += score;
        scoredConceptsCount++;
      }

      if (score >= 0.8) {
        strongCount++;
      } else if (score >= 0.5) {
        developingCount++;
      } else {
        attentionCount++;
      }

      return {
        id: c.id,
        name: c.name,
        score,
        scorePercentage: scorePct,
        status,
        projectName: c.project.name,
        projectId: c.project.id,
        ownerName: c.project.space?.user?.name || 'Unknown',
      };
    });

    const avgMastery =
      scoredConceptsCount > 0 ? Math.round((totalScore / scoredConceptsCount) * 100) : null;

    return {
      stats: {
        totalConcepts: concepts.length,
        averageMastery: avgMastery,
        strongConcepts: strongCount,
        developingConcepts: developingCount,
        requiresAttention: attentionCount,
      },
      concepts: list.slice(0, 50),
    };
  }

  /**
   * System Activity audit logs with pagination and eventType filter.
   */
  async getActivity(params: PaginationParams & { eventType?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 20, 1), 100);
    const skip = (page - 1) * pageSize;
    const eventType = params.eventType && params.eventType !== 'ALL' ? params.eventType : undefined;

    const where: any = {};
    if (eventType) {
      where.eventType = eventType;
    }
    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { project: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [totalEvents, events] = await Promise.all([
      prisma.learningEvent.count({ where }),
      prisma.learningEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        metadata: e.metadata,
        timestamp: e.timestamp.toISOString(),
        user: {
          id: e.user.id,
          name: e.user.name,
          email: e.user.email,
        },
        project: {
          id: e.project.id,
          name: e.project.name,
        },
      })),
      pagination: {
        page,
        pageSize,
        totalRecords: totalEvents,
        totalPages: Math.ceil(totalEvents / pageSize) || 1,
      },
    };
  }

  /**
   * Real System Health checks.
   * Only reports components that exist in the architecture.
   * Never exposes API keys, DB credentials, or secrets.
   */
  async getHealth() {
    // 1. Backend Service
    const memory = process.memoryUsage();
    const backendHealth = {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryHeapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };

    // 2. Database Connectivity Check
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch (err) {
      dbStatus = 'unhealthy';
    }

    const databaseHealth = {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    };

    // 3. AI Service Configuration Check
    const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
    const isConfigured =
      typeof apiKey === 'string' &&
      apiKey.trim().length > 0 &&
      !apiKey.trim().startsWith('mock') &&
      apiKey.trim() !== 'your-gemini-api-key-here';

    const aiHealth = {
      status: isConfigured ? 'healthy' : 'warning',
      configured: isConfigured,
      model: process.env.GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-3.6-flash',
      message: isConfigured ? 'Gemini API configured' : 'Gemini API key is not configured or using placeholder',
    };

    // 4. Background Worker & Jobs Queue Status
    const [queuedJobs, processingJobs, failedJobs, completedJobs] = await Promise.all([
      prisma.backgroundJob.count({ where: { status: JobStatus.QUEUED } }),
      prisma.backgroundJob.count({ where: { status: JobStatus.PROCESSING } }),
      prisma.backgroundJob.count({ where: { status: JobStatus.FAILED } }),
      prisma.backgroundJob.count({ where: { status: JobStatus.COMPLETED } }),
    ]);

    const workerStatus = failedJobs > 5 ? 'degraded' : 'healthy';

    const workerHealth = {
      status: workerStatus,
      queue: {
        queued: queuedJobs,
        processing: processingJobs,
        failed: failedJobs,
        completed: completedJobs,
      },
    };

    return {
      overall: dbStatus === 'healthy' && aiHealth.status !== 'unhealthy' ? 'operational' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        backend: backendHealth,
        database: databaseHealth,
        aiService: aiHealth,
        backgroundWorker: workerHealth,
      },
    };
  }

  /**
   * Historical Chart Aggregations with real DB records.
   */
  async getCharts() {
    const [users, quizzes, materials, tutorMessages] = await Promise.all([
      prisma.user.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.quiz.findMany({
        where: { completedAt: { not: null }, score: { not: null } },
        select: { completedAt: true, score: true },
        orderBy: { completedAt: 'asc' },
      }),
      prisma.material.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.message.findMany({
        where: { sender: 'user' },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Group users by date (YYYY-MM-DD)
    const userGrowthMap = new Map<string, number>();
    let cumulativeUsers = 0;
    for (const u of users) {
      const dateKey = u.createdAt.toISOString().slice(0, 10);
      userGrowthMap.set(dateKey, (userGrowthMap.get(dateKey) || 0) + 1);
    }
    const userGrowthTrend: Array<{ date: string; count: number; cumulative: number }> = [];
    for (const [date, count] of userGrowthMap.entries()) {
      cumulativeUsers += count;
      userGrowthTrend.push({ date, count, cumulative: cumulativeUsers });
    }

    // Group completed quizzes by date
    const quizPerfMap = new Map<string, { totalScore: number; count: number }>();
    for (const q of quizzes) {
      if (!q.completedAt) continue;
      const dateKey = q.completedAt.toISOString().slice(0, 10);
      const cur = quizPerfMap.get(dateKey) || { totalScore: 0, count: 0 };
      cur.totalScore += q.score ?? 0;
      cur.count += 1;
      quizPerfMap.set(dateKey, cur);
    }
    const quizPerformanceTrend = Array.from(quizPerfMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      averageScore: Math.round((data.totalScore / data.count) * 100),
    }));

    // Group tutor interactions by date
    const tutorMap = new Map<string, number>();
    for (const m of tutorMessages) {
      const dateKey = m.createdAt.toISOString().slice(0, 10);
      tutorMap.set(dateKey, (tutorMap.get(dateKey) || 0) + 1);
    }
    const tutorActivityTrend = Array.from(tutorMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Material distribution
    const materialDistribution = materials.map((m) => ({
      status: m.status,
      count: m._count.id,
    }));

    return {
      userGrowth: userGrowthTrend,
      quizPerformance: quizPerformanceTrend,
      tutorActivity: tutorActivityTrend,
      materialDistribution,
    };
  }
}

export const adminService = new AdminService();
