import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
                ...config.getOrThrow<TypeOrmModuleOptions>('database'),
                autoLoadEntities: true,
                synchronize: process.env.NODE_ENV !== 'production',
            }),
        }),
    ],
})
export class DatabaseModule {}
