import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule, { rawBody: true });

    app.enableCors({
        origin: process.env.CORS_ORIGIN ?? '*', // lock down in production
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    app.use(cookieParser()); // required for req.cookies — used by jwt-refresh strategy

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const config = new DocumentBuilder()
        .setTitle('Social Media API')
        .setDescription('NestJS Social Media Backend API')
        .setVersion('1.0.0')
        .addTag('auth')
        .addTag('users')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
