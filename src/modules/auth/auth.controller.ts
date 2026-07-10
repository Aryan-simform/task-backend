import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    private setRefreshCookie(res: Response, token: string): void {
        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // keep in sync with jwt.refreshExpiresIn
            path: '/auth', // only sent to /auth/refresh and /auth/logout — not every request
        });
    }

    @Public()
    @Post('register')
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ accessToken: string }> {
        const { accessToken, refreshToken } =
            await this.authService.register(dto);
        this.setRefreshCookie(res, refreshToken);
        return { accessToken };
    }

    @Public()
    @Post('login')
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ accessToken: string }> {
        const { accessToken, refreshToken } = await this.authService.login(dto);
        this.setRefreshCookie(res, refreshToken);
        return { accessToken };
    }

    @Public()
    @UseGuards(AuthGuard('jwt-refresh'))
    @Post('refresh')
    async refresh(
        @CurrentUser() user: { sub: string; refreshToken: string },
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ accessToken: string }> {
        const { accessToken, refreshToken } = await this.authService.refresh(
            user.refreshToken,
            user.sub,
        );
        this.setRefreshCookie(res, refreshToken);
        return { accessToken };
    }

    @Post('logout')
    async logout(
        @CurrentUser('sub') userId: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        await this.authService.logout(userId);
        res.clearCookie('refreshToken', { path: '/auth' });
        return { message: 'logged out' };
    }
}
