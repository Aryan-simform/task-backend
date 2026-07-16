import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PostRepository, FeedCursor } from './repositories/post.repository';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { Post, PostStatus } from './entities/post.entity';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RequestMediaUploadDto } from './dto/request-media-upload.dto';
import {
    MediaStatus,
    MediaType,
    PostMedia,
} from './entities/post-media.entity';
import { PostLike } from './entities/post-like.entity';
import { DatabaseService } from '../../database/database.service';
import {
    getPgErrorCode,
    PG_FOREIGN_KEY_VIOLATION,
    PG_UNIQUE_VIOLATION,
} from '../../common/utils/postgres-error.util';
export interface FeedPage {
    data: Post[];
    nextCursor: string | null;
}

@Injectable()
export class PostService {
    constructor(
        private readonly postRepo: PostRepository,
        private readonly cloudinaryService: CloudinaryService,
        private readonly configService: ConfigService,
        private readonly databaseService: DatabaseService,
    ) {}

    async create(authorId: string, dto: CreatePostDto): Promise<Post> {
        const status =
            dto.mediaCount && dto.mediaCount > 0
                ? PostStatus.UPLOADING
                : PostStatus.READY;
        return this.postRepo.create({ authorId, caption: dto.caption, status });
    }

    async findById(id: string): Promise<Post> {
        const post = await this.postRepo.findById(id);
        if (!post) throw new NotFoundException('post not found');
        return post;
    }

    async remove(userId: string, postId: string): Promise<void> {
        const post = await this.findById(postId);
        if (post.authorId !== userId) {
            throw new ForbiddenException("you don't own this post");
        }
        await this.postRepo.delete(postId);
    }

    private encodeCursor(cursor: FeedCursor): string {
        return Buffer.from(
            `${cursor.createdAt.toISOString()}|${cursor.id}`,
        ).toString('base64');
    }

    private decodeCursor(cursor: string): FeedCursor {
        try {
            const decoded = Buffer.from(cursor, 'base64').toString('utf8');
            const [createdAt, id] = decoded.split('|');

            if (!createdAt || !id) {
                throw new Error();
            }

            return {
                createdAt: new Date(createdAt),
                id,
            };
        } catch {
            throw new BadRequestException('Invalid cursor');
        }
    }

    async getFeed(query: FeedQueryDto): Promise<FeedPage> {
        const limit = query.limit ?? 20;

        const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

        const rows = await this.postRepo.findFeedPage(cursor, limit + 1);

        const hasMore = rows.length > limit;

        const data = hasMore ? rows.slice(0, limit) : rows;

        let nextCursor: string | null = null;

        if (hasMore) {
            const last = data[data.length - 1];

            nextCursor = this.encodeCursor({
                createdAt: last.createdAt,
                id: last.id,
            });
        }

        return {
            data,
            nextCursor,
        };
    }

    async requestMediaUpload(
        userId: string,
        postId: string,
        dto: RequestMediaUploadDto,
    ): Promise<{
        uploadUrl: string;
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        mediaId: string;
        publicId: string;
        folder: string;
        notificationUrl: string;
    }> {
        const post = await this.findById(postId);

        if (post.authorId !== userId)
            throw new ForbiddenException('you have no right of this post');

        const media = await this.postRepo.createMedia({
            postId,
            type: dto.type,
            position: dto.position,
            status: MediaStatus.UPLOADING,
        });
        const notificationUrl = this.configService.getOrThrow<string>(
            'cloudinary.notificationUrl',
        );
        const resourceType: 'image' | 'video' =
            dto.type === MediaType.VIDEO ? 'video' : 'image';
        const folder = `posts/${postId}`;

        const signed = this.cloudinaryService.generateSignedUploadParams({
            public_id: media.id, // just the id — folder supplies the path prefix
            folder,
            notification_url: notificationUrl,
        });

        return {
            uploadUrl: `https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`,
            ...signed,
            mediaId: media.id,
            publicId: `${folder}/${media.id}`, // what Cloudinary will actually store — matches what the webhook will send back
            folder,
            notificationUrl,
        };
    }

    async markMediaReady(mediaId: string, url: string): Promise<void> {
        await this.postRepo.updateMediaStatus(mediaId, {
            status: MediaStatus.READY,
            url,
        });
    }

    async getMediaForPost(postId: string): Promise<PostMedia[]> {
        return this.postRepo.findMediaByPost(postId);
    }

    async updateStatus(postId: string, status: PostStatus): Promise<void> {
        await this.postRepo.updateStatus(postId, status);
    }

    async like(userId: string, postId: string): Promise<void> {
        await this.databaseService.transaction(async (manager) => {
            try {
                await manager.insert(PostLike, { userId, postId });
            } catch (err) {
                const code = getPgErrorCode(err);
                if (code === PG_UNIQUE_VIOLATION) return; // already liked — idempotent, not an error
                if (code === PG_FOREIGN_KEY_VIOLATION)
                    throw new NotFoundException('post not found');
                throw err;
            }
            await manager.increment(Post, { id: postId }, 'likesCount', 1);
        });
    }

    async unlike(userId: string, postId: string): Promise<void> {
        await this.databaseService.transaction(async (manager) => {
            const result = await manager.delete(PostLike, { userId, postId });
            if (result.affected && result.affected > 0)
                await manager.decrement(Post, { id: postId }, 'likesCount', 1);
        });
    }
}
