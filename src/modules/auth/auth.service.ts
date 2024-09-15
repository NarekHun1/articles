import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return { id: user.id, email: user.email };
    }
    return null;
  }

  async register(email: string, password: string) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.createUser(email, hashedPassword);
    return this.generateTokens(user.id);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id);
  }

  private async generateTokens(userId: number) {
    const payload = { sub: userId };

    const accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessTokenExpires =
      this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m';

    const refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshTokenExpires =
      this.configService.get<string>('JWT_REFRESH_EXPIRES') || '7d';

    const access_token = this.jwtService.sign(payload, {
      secret: accessTokenSecret,
      expiresIn: accessTokenExpires,
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenExpires,
    });

    return { access_token, refresh_token };
  }
}
