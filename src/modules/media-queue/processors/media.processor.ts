import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { MEDIA_QUEUE } from '../media-queue.constants';

interface AvatarUploadedJob {
    publicId: string;
    secureUrl: string;
}

@Processor(MEDIA_QUEUE)
@Injectable()
export class MediaProcessor extends WorkerHost {
    private readonly logger = new Logger(MediaProcessor.name);

    constructor(private readonly userService: UserService) {
        super();
    }

    async process(job: Job<AvatarUploadedJob>): Promise<void> {
        switch (job.name) {
            case 'avatar-uploaded':
                await this.handleAvatarUploaded(job.data);
                return;
            default:
                this.logger.warn(`unhandled job type: ${job.name}`);
        }
    }

    private async handleAvatarUploaded(data: AvatarUploadedJob): Promise<void> {
        // publicId is "avatars/{userId}" — same string we set at signing time
        const parts = data.publicId.split('/');
        const userId = parts[1];
        if (!userId || parts.length < 2) {
            this.logger.error(
                `handleAvatarUploaded: malformed publicId "${data.publicId}" — expected "avatars/{uuid}". Skipping job.`,
            );
            return;
        }
        await this.userService.updateAvatarUrl(userId, data.secureUrl);
        this.logger.log(`avatar updated for user ${userId}`);
    }
}
