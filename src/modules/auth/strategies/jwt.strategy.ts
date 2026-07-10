import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../interface/jwtPayload.interface';

interface JwtUser {
    sub: string;
    email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
        });
    }

    // Runs after signature+expiry check passes. Return value becomes req.user.
    async validate(payload: JwtPayload): Promise<JwtUser> {
        const user = await this.userService.findById(payload.sub);
        if (!user) throw new UnauthorizedException();
        return { sub: user.id, email: user.email };
    }
}
