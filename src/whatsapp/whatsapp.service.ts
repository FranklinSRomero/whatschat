import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SendTextResult {
  waMessageId?: string;
  errorMessage?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendTextMessage(to: string, body: string): Promise<SendTextResult> {
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION', 'v20.0');
    const token = this.configService.get<string>('WHATSAPP_TOKEN', '');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');

    if (!token || !phoneNumberId) {
      return {
        errorMessage: 'WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados',
      };
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const waMessageId = response.data?.messages?.[0]?.id as string | undefined;
      return { waMessageId };
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message || error?.message || 'Error enviando mensaje a Meta';
      this.logger.error(`Error enviando mensaje: ${message}`);
      return { errorMessage: message };
    }
  }
}