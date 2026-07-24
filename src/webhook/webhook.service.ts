import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly chatService: ChatService) {}

  async process(payload: any) {
    const entries = payload?.entry;
    if (!Array.isArray(entries)) {
      return;
    }

    for (const entry of entries) {
      const changes = entry?.changes;
      if (!Array.isArray(changes)) {
        continue;
      }

      for (const change of changes) {
        const value = change?.value;
        if (!value) {
          continue;
        }

        const profileByWaId = new Map<string, string>();
        const contacts = value?.contacts;
        if (Array.isArray(contacts)) {
          for (const contact of contacts) {
            const waId = contact?.wa_id as string | undefined;
            const profileName = contact?.profile?.name as string | undefined;
            if (waId && profileName) {
              profileByWaId.set(waId, profileName);
            }
          }
        }

        const messages = value?.messages;
        if (Array.isArray(messages)) {
          for (const message of messages) {
            if (!message?.id || !message?.from) {
              continue;
            }

            const textBody = message?.text?.body as string | undefined;
            await this.chatService.processInboundMessage({
              waMessageId: message.id,
              from: message.from,
              name: profileByWaId.get(message.from),
              text: textBody,
              type: message.type,
            });
          }
        }

        const statuses = value?.statuses;
        if (Array.isArray(statuses)) {
          for (const status of statuses) {
            if (!status?.id || !status?.status) {
              continue;
            }

            const errorMessage = status?.errors?.[0]?.title as string | undefined;
            await this.chatService.processStatusUpdate({
              waMessageId: status.id,
              status: status.status,
              recipientId: status.recipient_id,
              errorMessage,
            });
          }
        }
      }
    }

    this.logger.log('Webhook procesado correctamente');
  }
}