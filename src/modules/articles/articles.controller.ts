import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { FindArticlesDto } from './dto/find-articles.dto';
import { CurrentUser } from '../users/user.decorator';
import { User } from '../users/users.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Article } from './articles.entity';

@Controller('articles')
@ApiTags('articles')
@UseInterceptors(CacheInterceptor)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an article' })
  @ApiResponse({
    status: 201,
    description: 'The article has been created.',
    type: Article,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser() user: User,
  ) {
    return this.articlesService.create(createArticleDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all articles' })
  @ApiResponse({
    status: 200,
    description: 'List of articles.',
    type: [Article],
  })
  async findAll(@Query() findArticlesDto: FindArticlesDto) {
    return this.articlesService.findAll(findArticlesDto);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get article by ID' })
  @ApiResponse({
    status: 200,
    description: 'The article found.',
    type: Article,
  })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  findOne(@Param('id') id: number) {
    return this.articlesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an article' })
  @ApiResponse({
    status: 200,
    description: 'The article has been updated.',
    type: Article,
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id') id: number,
    @Body() updateArticleDto: UpdateArticleDto,
    @CurrentUser() user: User,
  ) {
    return this.articlesService.update(id, updateArticleDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an article' })
  @ApiResponse({ status: 204, description: 'The article has been deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: number, @CurrentUser() user: User) {
    return this.articlesService.remove(id, user);
  }
}
