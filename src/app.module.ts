import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ClassSerializerInterceptor, MiddlewareConsumer } from '@nestjs/common';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import jwtConfig from './config/jwt.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import redisConfig from './config/redis.config';
import cloudinaryConfig from './config/cloudinary.config';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksModule } from 'src/modules/webhooks/webhooks.module';
import { FollowModule } from './modules/follow/follow.module';
import { PostModule } from './modules/post/post.module';
@Module({
    controllers: [AppController],
    providers: [
        AppService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor }, // strips @Exclude fields — runs first
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor }, // wraps response shape — runs second
    ],
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, jwtConfig, redisConfig, cloudinaryConfig],
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: config.getOrThrow<string>('redis.host'),
                    port: Number.parseInt(
                        config.getOrThrow<string>('redis.port'),
                        10,
                    ),
                },
            }),
        }),
        DatabaseModule,
        UserModule,
        AuthModule,
        WebhooksModule,
        FollowModule,
        PostModule,
    ],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(LoggerMiddleware).forRoutes('*');
    }
}
