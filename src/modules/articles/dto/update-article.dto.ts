import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  title: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  publishedAt?: Date;
}
