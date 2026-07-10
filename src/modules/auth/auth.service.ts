import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import ms from 'ms';
import * as argon2 from 'argon2';
import { UserService } from '../user/user.service';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly refreshTokenRepo: RefreshTokenRepository,
    ) {}

    async register(dto: RegisterDto): Promise<TokenPair> {
        const isExisting = await this.userService.findByEmail(dto.email);
        if (isExisting)
            throw new ConflictException(
                'User with this email already exists, try logging in',
            );

        const hashedPassword = await argon2.hash(dto.password);
        const user = await this.userService.create({
            ...dto,
            password: hashedPassword,
        });
        if (!user)
            throw new InternalServerErrorException(
                'Could not create user, try again',
            );

        return this.issueTokenPair(user);
    }

    async login(dto: LoginDto): Promise<TokenPair> {
        const user = await this.userService.findByEmail(dto.email);
        if (!user) throw new UnauthorizedException('invalid credentials');

        const isValid = await argon2.verify(user.password, dto.password);
        if (!isValid) throw new UnauthorizedException('invalid credentials');

        return this.issueTokenPair(user);
    }

    async refresh(presentedToken: string, userId: string): Promise<TokenPair> {
        const activeSessions =
            await this.refreshTokenRepo.findActiveByUser(userId);

        let matchedSession: (typeof activeSessions)[number] | null = null;

        for (const session of activeSessions) {
            const matches = await argon2.verify(
                session.tokenHash,
                presentedToken,
            );

            if (matches) {
                matchedSession = session;
                break;
            }
        }

        // No matching refresh token -> possible token theft.
        if (!matchedSession) {
            await this.refreshTokenRepo.revokeAllForUser(userId);
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Refresh token rotation: revoke the used token.
        await this.refreshTokenRepo.revoke(matchedSession.id);

        // Re-fetch the user to ensure they still exist.
        const user = await this.userService.findById(userId);
        if (!user) throw new UnauthorizedException();

        return this.issueTokenPair({ id: user.id, email: user.email });
    }

    async logout(userId: string): Promise<void> {
        return this.refreshTokenRepo.revokeAllForUser(userId);
    }

    private async issueTokenPair(user: {
        id: string;
        email: string;
    }): Promise<TokenPair> {
        const accessToken = this.jwtService.sign(
            { sub: user.id, email: user.email },
            {
                secret: this.configService.getOrThrow<string>(
                    'jwt.accessSecret',
                ),
                expiresIn: this.configService.getOrThrow<StringValue>(
                    'jwt.accessExpiresIn',
                ),
            },
        );
        const refreshToken = await this.jwtService.signAsync(
            { sub: user.id, email: user.email },
            {
                secret: this.configService.getOrThrow<string>(
                    'jwt.refreshSecret',
                ),
                expiresIn: this.configService.getOrThrow<StringValue>(
                    'jwt.refreshExpiresIn',
                ),
            },
        );

        const tokenHash = await argon2.hash(refreshToken);
        const expiresInStr = this.configService.getOrThrow<StringValue>(
            'jwt.refreshExpiresIn',
        );
        const expiresAt = new Date(Date.now() + ms(expiresInStr));

        await this.refreshTokenRepo.create({
            userId: user.id,
            tokenHash,
            expiresAt,
        });

        return { accessToken, refreshToken };
    }
}
