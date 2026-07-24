import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as Joi from 'joi';
import { join } from 'path';
import { AppController } from './app.controller';
import { ChatModule } from './chat/chat.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebhookModule } from './webhook/webhook.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        WHATSAPP_API_VERSION: Joi.string().default('v20.0'),
        WHATSAPP_TOKEN: Joi.string().allow('').required(),
        WHATSAPP_PHONE_NUMBER_ID: Joi.string().allow('').required(),
        WHATSAPP_VERIFY_TOKEN: Joi.string().required(),
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    PrismaModule,
    WhatsAppModule,
    ChatModule,
    WebhookModule,
  ],
  controllers: [AppController],
})
export class AppModule {}