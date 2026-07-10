import { Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Public } from 'src/common/decorators/public.decorator';
import { MEDIA_QUEUE } from '../media-queue/media-queue.module';

@Controller('webhooks')
export class WebhooksController {
    constructor(
        private readonly cloudinaryService: CloudinaryService,
        @InjectQueue(MEDIA_QUEUE) private readonly mediaQueue: Queue,
    ) {}

    @Public()
    @Post('cloudinary')
    async handleCloudinaryWebhook(
        @Req() req: RawBodyRequest<Request>,
    ): Promise<{ received: true }> {
        const timestamp = req.headers['x-cld-timestamp'] as string;
        const signature = req.headers['x-cld-signature'] as string;
        const rawBody = req.rawBody?.toString('utf-8') ?? '';
        const isValid = this.cloudinaryService.verifyWebhookSignature(
            rawBody,
            timestamp,
            signature,
        );
        if (!isValid)
            throw new UnauthorizedException('invalid webhook signature');

        const payload = JSON.parse(rawBody) as {
            notification_type: string;
            public_id: string;
            secure_url: string;
        };

        if (payload.notification_type === 'upload') {
            await this.mediaQueue.add('avatar-uploaded', {
                publicId: payload.public_id,
                secureUrl: payload.secure_url,
            });
        }
        return { received: true };
    }
}
