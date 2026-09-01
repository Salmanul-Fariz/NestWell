import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_ROTATE_AFTER_MS,
  REFRESH_ROTATION_GRACE_MS,
  REFRESH_TOKEN_TTL,
} from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const tokens = await this.generateTokens(user._id.toString(), user.email);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async refresh(dto: { refreshToken?: string }) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: { sub: string; email: string; iat?: number };
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Session is no longer active. Please sign in again.');
    }

    const presented = digestToken(dto.refreshToken);
    const matchesCurrent = user.refreshTokenHash
      ? await bcrypt.compare(presented, user.refreshTokenHash)
      : false;

    const rotatedAt = user.refreshTokenRotatedAt?.getTime() ?? 0;
    const withinGrace = Date.now() - rotatedAt <= REFRESH_ROTATION_GRACE_MS;
    const matchesPrevious =
      !matchesCurrent &&
      withinGrace &&
      !!user.previousRefreshTokenHash &&
      (await bcrypt.compare(presented, user.previousRefreshTokenHash));

    // If hash was missing or token is valid, accept and renew
    if (user.refreshTokenHash && !matchesCurrent && !matchesPrevious) {
      throw new UnauthorizedException('Session is no longer active. Please sign in again.');
    }

    const accessToken = await this.signAccessToken(user._id.toString(), user.email);
    const refreshToken = await this.signRefreshToken(user._id.toString(), user.email);
    const salt = await bcrypt.genSalt(10);
    const nextHash = await bcrypt.hash(digestToken(refreshToken), salt);
    await this.usersService.rotateRefreshTokenHash(
      user._id.toString(),
      nextHash,
      user.refreshTokenHash || nextHash,
    );

    return { accessToken, refreshToken };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshTokenHash(userId, null);
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(digestToken(refreshToken), salt);
    await this.usersService.updateRefreshTokenHash(userId, hash);
  }

  async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(userId, email),
      this.signRefreshToken(userId, email),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private accessSecret(): string {
    return (
      this.configService.get<string>('JWT_SECRET') ||
      'nestwell_super_secret_jwt_access_key_2026'
    );
  }

  private refreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'nestwell_super_secret_jwt_refresh_key_2026'
    );
  }

  private signAccessToken(userId: string, email: string) {
    return this.jwtService.signAsync(
      { sub: userId, email },
      { secret: this.accessSecret(), expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  private signRefreshToken(userId: string, email: string) {
    return this.jwtService.signAsync(
      { sub: userId, email },
      { secret: this.refreshSecret(), expiresIn: REFRESH_TOKEN_TTL },
    );
  }
}

/** bcrypt only hashes the first 72 bytes; digest first so the full JWT is covered. */
function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
