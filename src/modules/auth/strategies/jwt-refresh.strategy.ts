import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { JwtPayload } from '../interface/jwtPayload.interface';

interface JwtRefreshUser {
    sub: string;
    email: string;
    refreshToken: string;
}

const cookieExtractor = (req: Request): string | null => {
    return (req?.cookies as Record<string, string>)?.refreshToken ?? null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh',
) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: cookieExtractor,
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'),
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: JwtPayload): JwtRefreshUser {
        const cookies = req.cookies as Record<string, string> | undefined;
        return {
            sub: payload.sub,
            email: payload.email,
            refreshToken: cookies?.refreshToken ?? '',
        };
    }
}
