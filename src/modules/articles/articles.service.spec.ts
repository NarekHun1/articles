import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from './articles.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Article } from './articles.entity';
import { User } from '../users/users.entity';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FindArticlesDto } from './dto/find-articles.dto';
import { NotFoundException } from '@nestjs/common';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let repository: Repository<Article>;
  let cacheManager: Cache;

  beforeEach(async () => {
    // Mock the QueryBuilder
    const queryBuilderMock = {
      innerJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
          },
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    repository = module.get<Repository<Article>>(getRepositoryToken(Article));
    cacheManager = module.get<Cache>('CACHE_MANAGER');
  });

  describe('findAll', () => {
    it('should return cached articles if available', async () => {
      const findArticlesDto: FindArticlesDto = { page: 1, limit: 10 };
      const cachedArticles: Article[] = [new Article(), new Article()];

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedArticles as any);

      expect(await service.findAll(findArticlesDto)).toEqual(cachedArticles);
    });

    it('should fetch from database and cache if not available in cache', async () => {
      const findArticlesDto: FindArticlesDto = { page: 1, limit: 10 };
      const articles: Article[] = [new Article(), new Article()];

      // Configure the mock to return articles when getMany is called
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const queryBuilderMock =
        repository.createQueryBuilder() as jest.Mocked<any>;
      queryBuilderMock.getMany.mockResolvedValue(articles);
      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilderMock);

      // Configure the mock to ensure the cache set is called
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      expect(await service.findAll(findArticlesDto)).toEqual(articles);
    });
  });

  describe('findOne', () => {
    it('should return cached article if available', async () => {
      const id = 1;
      const cachedArticle: Article = new Article();

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedArticle as any);

      expect(await service.findOne(id)).toEqual(cachedArticle);
    });

    it('should fetch from database and cache if not available in cache', async () => {
      const id = 1;
      const article: Article = new Article();

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const queryBuilderMock =
        repository.createQueryBuilder() as jest.Mocked<any>;
      queryBuilderMock.getOne.mockResolvedValue(article);
      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilderMock);

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      expect(await service.findOne(id)).toEqual(article);
    });

    it('should throw NotFoundException if article not found', async () => {
      const id = 1;

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const queryBuilderMock =
        repository.createQueryBuilder() as jest.Mocked<any>;
      queryBuilderMock.getOne.mockResolvedValue(null);
      jest
        .spyOn(repository, 'createQueryBuilder')
        .mockReturnValue(queryBuilderMock);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and save an article if author matches', async () => {
      const id = 1;
      const updateArticleDto: UpdateArticleDto = { title: 'Updated Title' };
      const user: User = { id: 1 } as User;
      const article: Article = {
        id: 1,
        author: user,
      } as Article;

      jest.spyOn(service, 'findOne').mockResolvedValue(article);
      jest
        .spyOn(repository, 'save')
        .mockResolvedValue({ ...article, ...updateArticleDto });
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      expect(await service.update(id, updateArticleDto, user)).toEqual({
        ...article,
        ...updateArticleDto,
      });
    });

    it('should throw NotFoundException if author does not match', async () => {
      const id = 1;
      const updateArticleDto: UpdateArticleDto = { title: 'Updated Title' };
      const user: User = { id: 2 } as User;
      const article: Article = {
        id: 1,
        author: { id: 1 } as User, // Different author
      } as Article;

      jest.spyOn(service, 'findOne').mockResolvedValue(article);

      await expect(service.update(id, updateArticleDto, user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an article if author matches', async () => {
      const id = 1;
      const user: User = { id: 1 } as User;
      const article: Article = {
        id: 1,
        author: user,
      } as Article;

      jest.spyOn(service, 'findOne').mockResolvedValue(article);
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.remove(id, user);

      expect(repository.delete).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException if author does not match', async () => {
      const id = 1;
      const user: User = { id: 2 } as User;
      const article: Article = {
        id: 1,
        author: { id: 1 } as User,
      } as Article;

      jest.spyOn(service, 'findOne').mockResolvedValue(article);

      await expect(service.remove(id, user)).rejects.toThrow(NotFoundException);
    });
  });
});
