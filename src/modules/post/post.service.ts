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
import { MediaVariants } from '../cloudinary/cloudinary.service';
import { CacheService } from '../../common/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache.constants';

export interface FeedPage {
    data: Post[];
    nextCursor: string | null;
}

export interface MediaWithVariants extends Omit<PostMedia, 'url'> {
    url: string | null;
    variants: MediaVariants | null;
}

export interface PostWithVariants extends Omit<Post, 'media'> {
    media: MediaWithVariants[];
}

@Injectable()
export class PostService {
    constructor(
        private readonly postRepo: PostRepository,
        private readonly cloudinaryService: CloudinaryService,
        private readonly configService: ConfigService,
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    async findByIdWithVariants(id: string): Promise<PostWithVariants> {
        const post = await this.findById(id);

        const media = post.media.map((m): MediaWithVariants => {
            if (m.status !== MediaStatus.READY || !m.url) {
                return { ...m, variants: null };
            }
            switch (m.type) {
                case MediaType.IMAGE:
                    return {
                        ...m,
                        variants: this.cloudinaryService.getImageVariants(
                            m.url,
                        ),
                    };
                case MediaType.VIDEO:
                    // video transformations (poster frames, adaptive bitrate) need different
                    // parameters than images — not building that now, full url for all three
                    // slots until there's a real consumer for video thumbnails specifically
                    return {
                        ...m,
                        variants: this.cloudinaryService.getVideoPosterVariants(
                            m.url,
                        ),
                    };
            }
        });
        return { ...post, media };
    }

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
        await this.postRepo.softDelete(postId);
    }

    async restore(userId: string, postId: string): Promise<void> {
        const post = await this.postRepo.findByIdIncludingDeleted(postId);
        if (!post) throw new NotFoundException('post not found');
        if (post.authorId !== userId)
            throw new ForbiddenException("you don't own this post");
        await this.postRepo.restore(postId); // idempotent if already active
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

    async getFeed(viewerId: string, query: FeedQueryDto): Promise<FeedPage> {
        const limit = query.limit ?? 20;
        const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

        // only the first page is worth caching — deeper pages are rarely
        // re-requested and would multiply key cardinality for little benefit.
        const cacheKey = cursor
            ? null
            : cacheKeys.feedFirstPage(viewerId, limit);
        if (cacheKey) {
            const cached = await this.cacheService.get<FeedPage>(cacheKey);
            if (cached) return cached;
        }

        const rows = await this.postRepo.findFeedPage(
            cursor,
            limit + 1,
            viewerId,
        );
        const hasMore = rows.length > limit;
        const data = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore
            ? this.encodeCursor({
                  createdAt: data[data.length - 1].createdAt,
                  id: data[data.length - 1].id,
              })
            : null;
        const page: FeedPage = { data, nextCursor };

        // short TTL, no write-side invalidation: busting every follower's
        // cached feed on a new post (fan-out-on-write) is the harder problem
        // the task spec splits out separately — bound staleness with TTL instead.
        if (cacheKey)
            await this.cacheService.set(
                cacheKey,
                page,
                CACHE_TTL.FEED_FIRST_PAGE,
            );

        return page;
    }

    async getLikesCount(postId: string): Promise<number> {
        const cacheKey = cacheKeys.postLikesCount(postId);
        const cached = await this.cacheService.get<number>(cacheKey);
        if (cached !== null) return cached;

        const count = await this.postRepo.getLikesCount(postId);
        if (count === null) throw new NotFoundException('post not found');

        await this.cacheService.set(cacheKey, count, CACHE_TTL.LIKES_COUNT);
        return count;
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
        await this.findById(postId); // re-added — FK no longer proves "not deleted", only "exists"
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
        await this.cacheService.del(cacheKeys.postLikesCount(postId));
    }

    async unlike(userId: string, postId: string): Promise<void> {
        await this.databaseService.transaction(async (manager) => {
            const result = await manager.delete(PostLike, { userId, postId });
            if (result.affected && result.affected > 0)
                await manager.decrement(Post, { id: postId }, 'likesCount', 1);
        });
        await this.cacheService.del(cacheKeys.postLikesCount(postId));
    }
}
