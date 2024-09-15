import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService;
  let mockJwtService;
  let mockConfigService;

  beforeEach(async () => {
    mockUsersService = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
      };
      mockUsersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login('test@example.com', 'wrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens if credentials are valid', async () => {
      const password = 'password123';
      const user = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash(password, 10),
      };
      mockUsersService.findByEmail.mockResolvedValueOnce(user);

      const tokens = {
        access_token: 'accessToken',
        refresh_token: 'refreshToken',
      };
      mockJwtService.sign
        .mockReturnValueOnce('accessToken')
        .mockReturnValueOnce('refreshToken');

      const result = await service.login('test@example.com', password);
      expect(result).toEqual(tokens);
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('register', () => {
    it('should throw UnauthorizedException if user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      await expect(
        service.register('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should create a user and return tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createUser.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      const tokens = {
        access_token: 'accessToken',
        refresh_token: 'refreshToken',
      };
      mockJwtService.sign
        .mockReturnValueOnce('accessToken')
        .mockReturnValueOnce('refreshToken');

      const result = await service.register('test@example.com', 'password123');
      expect(result).toEqual(tokens);
      expect(mockUsersService.createUser).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });
  });
});
