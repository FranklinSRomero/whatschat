import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  getConversations() {
    return this.chatService.getConversations();
  }

  @Get('conversations/:id/messages')
  getConversationMessages(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.getConversationMessages(id);
  }

  @Post('conversations')
  createConversation(@Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(dto);
  }

  @Post('send')
  sendMessage(@Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(dto);
  }
}