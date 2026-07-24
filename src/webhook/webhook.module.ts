import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [ChatModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}