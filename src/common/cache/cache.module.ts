import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import KeyvRedis, { Keyv } from '@keyv/redis';
import { CacheService } from './cache.service';

// Global so every module can inject CacheService without re-importing this
// one, the same way ConfigModule.forRoot({ isGlobal: true }) works.
@Global()
@Module({
    imports: [
        NestCacheModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                stores: [
                    new Keyv({
                        store: new KeyvRedis(
                            `redis://${config.getOrThrow<string>('redis.host')}:${config.getOrThrow<number>('redis.port')}`,
                        ),
                    }),
                ],
            }),
        }),
    ],
    providers: [CacheService],
    exports: [CacheService],
})
export class AppCacheModule {}
