import { prisma } from '../config/prisma';
import { Conversation, Message } from '@prisma/client';

export class ConversationRepository {
  async findOrCreate(projectId: string, conversationId?: string, title?: string): Promise<Conversation> {
    if (conversationId) {
      const existing = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (existing && existing.projectId === projectId) return existing;
    }

    return prisma.conversation.create({
      data: {
        projectId,
        title: title || 'Tutor Session',
      },
    });
  }

  async getProjectConversations(projectId: string): Promise<Conversation[]> {
    return prisma.conversation.findMany({
      where: { projectId },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMessage(data: {
    conversationId: string;
    sender: 'user' | 'assistant';
    content: string;
    citations?: any;
    isSupported?: boolean;
  }): Promise<Message> {
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        sender: data.sender,
        content: data.content,
        citations: data.citations || null,
        isSupported: data.isSupported !== undefined ? data.isSupported : true,
      },
    });

    // Touch conversation updatedAt
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}

export const conversationRepository = new ConversationRepository();
