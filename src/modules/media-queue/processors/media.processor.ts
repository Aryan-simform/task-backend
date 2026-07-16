import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { PostService } from '../../post/post.service';
import { MEDIA_QUEUE } from '../media-queue.constants';
import { PostStatus } from '../../post/entities/post.entity';
import { MediaStatus } from '../../post/entities/post-media.entity';
interface AvatarUploadedJob {
    publicId: string;
    secureUrl: string;
}

interface PostMediaUploadedJob {
    publicId: string;
    secureUrl: string;
    resourceType: 'image' | 'video';
}

@Processor(MEDIA_QUEUE)
@Injectable()
export class MediaProcessor extends WorkerHost {
    private readonly logger = new Logger(MediaProcessor.name);

    constructor(
        private readonly userService: UserService,
        private readonly postService: PostService,
    ) {
        super();
    }

    async process(
        job: Job<AvatarUploadedJob | PostMediaUploadedJob>,
    ): Promise<void> {
        switch (job.name) {
            case 'avatar-uploaded':
                await this.handleAvatarUploaded(job.data);
                return;
            case 'post-media-uploaded':
                await this.handlePostMediaUploaded(
                    job.data as PostMediaUploadedJob,
                );
                return;
            default:
                this.logger.warn(`unhandled job type: ${job.name}`);
        }
    }

    private async handleAvatarUploaded(data: AvatarUploadedJob): Promise<void> {
        const userId = data.publicId.split('/')[1];
        await this.userService.updateAvatarUrl(userId, data.secureUrl);
        this.logger.log(`avatar updated for user ${userId}`);
    }

    private async handlePostMediaUploaded(
        data: PostMediaUploadedJob,
    ): Promise<void> {
        const [, postId, mediaId] = data.publicId.split('/');

        await this.postService.markMediaReady(mediaId, data.secureUrl);

        const allMedia = await this.postService.getMediaForPost(postId);
        const allReady = allMedia.every((m) => m.status === MediaStatus.READY);
        const anyFailed = allMedia.some((m) => m.status === MediaStatus.FAILED);

        if (anyFailed) {
            await this.postService.updateStatus(postId, PostStatus.FAILED);
        } else if (allReady) {
            await this.postService.updateStatus(postId, PostStatus.READY);
        }

        this.logger.log(`media ${mediaId} ready for post ${postId}`);
    }
}
