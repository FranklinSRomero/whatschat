import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  waId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}