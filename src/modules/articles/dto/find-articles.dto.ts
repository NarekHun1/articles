import { IsOptional, IsInt, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindArticlesDto {
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  page?: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  author?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  publishedAt?: string;
}
