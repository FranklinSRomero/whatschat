import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

const MESSAGE_TYPE = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  UNKNOWN: 'UNKNOWN',
} as const;

const MESSAGE_STATUS = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
  RECEIVED: 'RECEIVED',
} as const;

type MessageTypeValue = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];
type MessageStatusValue = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

interface WebhookInboundMessage {
  waMessageId: string;
  from: string;
  name?: string;
  text?: string;
  type?: string;
}

interface WebhookStatusUpdate {
  waMessageId: string;
  status: string;
  recipientId?: string;
  errorMessage?: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async getConversations() {
    const conversations = await this.prisma.conversation.findMany({
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((conversation) => {
      const lastMessage = conversation.messages[0] ?? null;
      return {
        id: conversation.id,
        contact: {
          id: conversation.contact.id,
          waId: conversation.contact.waId,
          name: conversation.contact.name,
        },
        lastMessage,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    });
  }

  async createConversation(dto: CreateConversationDto) {
    const sanitizedWaId = dto.waId.replace(/[^0-9]/g, '');
    if (sanitizedWaId.length < 7) {
      throw new BadRequestException('Numero de WhatsApp invalido');
    }

    const contact = await this.prisma.contact.upsert({
      where: { waId: sanitizedWaId },
      update: {
        name: dto.name || undefined,
      },
      create: {
        waId: sanitizedWaId,
        name: dto.name,
      },
    });

    const conversation = await this.prisma.conversation.upsert({
      where: { contactId: contact.id },
      update: { updatedAt: new Date() },
      create: { contactId: contact.id },
      include: { contact: true },
    });

    return {
      id: conversation.id,
      contact: conversation.contact,
      updatedAt: conversation.updatedAt,
    };
  }

  async getConversationMessages(conversationId: number) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const queuedMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        direction: 'OUTBOUND',
        type: MESSAGE_TYPE.TEXT,
        status: MESSAGE_STATUS.QUEUED,
        text: dto.text,
        toNumber: conversation.contact.waId,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const sendResult = await this.whatsAppService.sendTextMessage(conversation.contact.waId, dto.text);

    if (sendResult.errorMessage) {
      return this.prisma.message.update({
        where: { id: queuedMessage.id },
        data: {
          status: MESSAGE_STATUS.FAILED,
          errorMessage: sendResult.errorMessage,
        },
      });
    }

    return this.prisma.message.update({
      where: { id: queuedMessage.id },
      data: {
        status: MESSAGE_STATUS.SENT,
        waMessageId: sendResult.waMessageId,
        sentAt: new Date(),
      },
    });
  }

  async processInboundMessage(payload: WebhookInboundMessage) {
    const contact = await this.prisma.contact.upsert({
      where: { waId: payload.from },
      update: {
        name: payload.name || undefined,
      },
      create: {
        waId: payload.from,
        name: payload.name,
      },
    });

    const conversation = await this.prisma.conversation.upsert({
      where: { contactId: contact.id },
      update: { updatedAt: new Date() },
      create: { contactId: contact.id },
    });

    const existing = await this.prisma.message.findFirst({
      where: { waMessageId: payload.waMessageId },
    });

    if (existing) {
      await this.prisma.message.update({
        where: { id: existing.id },
        data: {
          text: payload.text,
          status: MESSAGE_STATUS.RECEIVED,
        },
      });
      return;
    }

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        contactId: contact.id,
        waMessageId: payload.waMessageId,
        direction: 'INBOUND',
        type: this.mapMessageType(payload.type),
        status: MESSAGE_STATUS.RECEIVED,
        text: payload.text,
        fromNumber: payload.from,
      },
    });
  }

  async processStatusUpdate(payload: WebhookStatusUpdate) {
    const mappedStatus = this.mapStatus(payload.status);
    if (!mappedStatus) {
      return;
    }

    await this.prisma.message.updateMany({
      where: { waMessageId: payload.waMessageId },
      data: {
        status: mappedStatus,
        errorMessage: payload.errorMessage,
      },
    });

    if (payload.recipientId) {
      await this.prisma.conversation.updateMany({
        where: { contact: { waId: payload.recipientId } },
        data: { updatedAt: new Date() },
      });
    }
  }

  private mapStatus(status: string): MessageStatusValue | null {
    switch (status) {
      case 'sent':
        return MESSAGE_STATUS.SENT;
      case 'delivered':
        return MESSAGE_STATUS.DELIVERED;
      case 'read':
        return MESSAGE_STATUS.READ;
      case 'failed':
        return MESSAGE_STATUS.FAILED;
      default:
        return null;
    }
  }

  private mapMessageType(type?: string): MessageTypeValue {
    switch (type) {
      case 'text':
        return MESSAGE_TYPE.TEXT;
      case 'image':
        return MESSAGE_TYPE.IMAGE;
      case 'audio':
        return MESSAGE_TYPE.AUDIO;
      case 'video':
        return MESSAGE_TYPE.VIDEO;
      case 'document':
        return MESSAGE_TYPE.DOCUMENT;
      default:
        return MESSAGE_TYPE.UNKNOWN;
    }
  }
}