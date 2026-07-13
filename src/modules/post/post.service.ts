import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PostRepository, FeedCursor } from './repositories/post.repository';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { Post } from './entities/post.entity';

export interface FeedPage {
    data: Post[];
    nextCursor: string | null;
}

@Injectable()
export class PostService {
    constructor(private readonly postRepo: PostRepository) {}

    async create(authorId: string, dto: CreatePostDto): Promise<Post> {
        return this.postRepo.create({ authorId, caption: dto.caption });
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
}
