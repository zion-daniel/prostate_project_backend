import {
  Body,
  Controller,
  HttpCode,
  Post,
  Query,
  Get,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import type { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { env } from '../../config/env';
import { setAccessTokenCookie, setAuthCookies } from './utils/cookie.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/interfaces/current-user.interface';
import type { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @ApiOperation({ summary: 'Verify email' })
  @HttpCode(HttpStatus.OK)
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    try {
      const result = await this.authService.verifyEmail(token);
      setAuthCookies(res, result.tokens);
      return res.redirect(
        302,
        `${env.FRONTEND_URL}/verify-email?status=success`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Email verification failed';
      const verificationUrl = new URL('/verify-email', env.FRONTEND_URL);
      verificationUrl.searchParams.set('status', 'error');
      verificationUrl.searchParams.set('message', message);
      return res.redirect(302, verificationUrl.toString());
    }
  }

  @Public()
  @ApiOperation({ summary: 'Login user' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto.email, dto.password, res);
  }

  @Public()
  @ApiOperation({ summary: 'Logout user' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshAccessToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshAccessToken(
      req.cookies?.refresh_token,
    );
    setAccessTokenCookie(res, result.accessToken);
    return {
      message: 'Access token refreshed successfully',
    };
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return this.authService.getCurrentUser(user.sub);
  }
}
