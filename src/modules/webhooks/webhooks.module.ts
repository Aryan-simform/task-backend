import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MediaQueueModule } from '../media-queue/media-queue.module';
import { WebhooksController } from './webhooks.controller';

@Module({
    imports: [CloudinaryModule, MediaQueueModule],
    controllers: [WebhooksController],
})
export class WebhooksModule {}
