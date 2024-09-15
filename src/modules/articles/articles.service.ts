import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { User } from '../users/users.entity';
import { Cache } from 'cache-manager';
import { Article } from './articles.entity';
import { FindArticlesDto } from './dto/find-articles.dto';
import { ARTICLES_CACHE_TTL } from './articles.constraints';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
  ) {}

  async create(
    createArticleDto: CreateArticleDto,
    author: User,
  ): Promise<Article> {
    const article = this.articlesRepository.create({
      ...createArticleDto,
      author,
    });
    const savedArticle = await this.articlesRepository.save(article);

    await this.cacheManager.del('articles');

    return savedArticle;
  }

  async findAll(findArticlesDto: FindArticlesDto): Promise<Article[]> {
    const { page = 1, limit = 10, ...filters } = findArticlesDto;
    const cacheKey = `articles:${page}:${limit}:${JSON.stringify(filters)}`;
    const cachedArticles = await this.cacheManager.get(cacheKey);

    if (cachedArticles) {
      return cachedArticles as Article[];
    }

    const query = this.articlesRepository
      .createQueryBuilder('article')
      .innerJoin('article.author', 'author')
      .addSelect(['author.id', 'author.email'])
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.author) {
      query.andWhere('author.id = :authorId', { authorId: filters.author });
    }

    if (filters.publishedAt) {
      query.andWhere('article.publishedAt > :publishedAt', {
        publishedAt: filters.publishedAt,
      });
    }

    const articles = await query.getMany();

    await this.cacheManager.set(cacheKey, articles, ARTICLES_CACHE_TTL);

    return articles;
  }
  async findOne(id: number): Promise<Article> {
    const cacheKey = `article:${id}`;
    const cachedArticle = await this.cacheManager.get(cacheKey);

    if (cachedArticle) {
      return cachedArticle as Article;
    }

    const article = await this.articlesRepository
      .createQueryBuilder('article')
      .innerJoin('article.author', 'author')
      .addSelect(['author.id', 'author.email'])
      .where('article.id = :id', { id })
      .getOne();

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    await this.cacheManager.set(cacheKey, article, ARTICLES_CACHE_TTL);

    return article;
  }

  async update(
    id: number,
    updateArticleDto: UpdateArticleDto,
    author: User,
  ): Promise<Article> {
    const article = await this.findOne(id);
    if (article.author.id !== author.id) {
      throw new NotFoundException('You are not allowed to update this article');
    }

    Object.assign(article, updateArticleDto);
    const updatedArticle = await this.articlesRepository.save(article);

    await this.cacheManager.del(`article:${id}`);
    await this.cacheManager.del('articles');

    return updatedArticle;
  }

  async remove(id: number, author: User): Promise<void> {
    const article = await this.findOne(id);
    if (article.author.id !== author.id) {
      throw new NotFoundException('You are not allowed to delete this article');
    }

    await this.articlesRepository.delete(id);

    await this.cacheManager.del(`article:${id}`);
    await this.cacheManager.del('articles');
  }
}
