import { Body, Controller, ForbiddenException, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { WebhookVerifyDto } from './dto/webhook-verify.dto';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly webhookService: WebhookService,
  ) {}

  @Get()
  verify(@Query() query: WebhookVerifyDto, @Res() res: Response) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    const expectedToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN', '');

    if (mode === 'subscribe' && token === expectedToken && challenge) {
      return res.status(200).send(challenge);
    }

    throw new ForbiddenException('Webhook verify token inválido');
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() payload: any) {
    await this.webhookService.process(payload);
    return { received: true };
  }
}