import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @Type(() => Number)
  @IsInt()
  conversationId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  text!: string;
}