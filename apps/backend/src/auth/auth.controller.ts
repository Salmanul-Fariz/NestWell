import { Controller, Post, Body, HttpCode, HttpStatus, Get, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ACCESS_TOKEN_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS } from './auth.constants';
import { authCookieOptions, clearAuthCookieOptions } from './cookie-options';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    req: Request,
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('access_token', accessToken, authCookieOptions(req, ACCESS_TOKEN_MAX_AGE_MS));
    res.cookie('refresh_token', refreshToken, authCookieOptions(req, REFRESH_TOKEN_MAX_AGE_MS));
  }

  private clearAuthCookies(req: Request, res: Response) {
    res.clearCookie('access_token', clearAuthCookieOptions(req));
    res.clearCookie('refresh_token', clearAuthCookieOptions(req));
  }

  @Public()
  @Post('register')
  async register(
    @Req() req: Request,
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(req, res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Req() req: Request,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(req, res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'] || dto?.refreshToken;
    try {
      const tokens = await this.authService.refresh({ refreshToken });
      this.setAuthCookies(req, res, tokens.accessToken, tokens.refreshToken);
      return tokens;
    } catch (err) {
      this.clearAuthCookies(req, res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    this.clearAuthCookies(req, res);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
