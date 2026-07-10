import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { UserModule } from '../user/user.module';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';

@Module({
    imports: [
        UserModule,
        PassportModule,
        TypeOrmModule.forFeature([RefreshToken]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('jwt.accessSecret'),
                signOptions: {
                    expiresIn: config.getOrThrow<StringValue>(
                        'jwt.accessExpiresIn',
                    ),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        JwtRefreshStrategy,
        RefreshTokenRepository,
    ],
})
export class AuthModule {}
