import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    CommentRepository,
    CommentCursor,
} from './repositories/comment.repository';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FeedQueryDto } from '../post/dto/feed-query.dto';
import { PostService } from '../post/post.service';
import { DatabaseService } from '../../database/database.service';
import { CommentLike } from './entities/comment-like.entity';

export interface CommentPage {
    data: Comment[];
    nextCursor: string | null;
}

@Injectable()
export class CommentService {
    constructor(
        private readonly commentRepo: CommentRepository,
        private readonly postService: PostService,
        private readonly databaseService: DatabaseService,
    ) {}

    async create(
        userId: string,
        postId: string,
        dto: CreateCommentDto,
    ): Promise<Comment> {
        await this.postService.findById(postId); // 404s if post doesn't exist

        if (dto.parentId) {
            const parent = await this.commentRepo.findById(dto.parentId);
            if (!parent || parent?.postId !== postId) {
                throw new NotFoundException(
                    'parent comment not found on this post',
                );
            }
            // replying to a deleted comment is allowed — the thread stays navigable
            // even if the parent's content is tombstoned
        }

        return this.databaseService.transaction(async (manager) => {
            const comment = await manager.save(Comment, {
                postId,
                authorId: userId,
                parentId: dto.parentId ?? null,
                content: dto.content,
            });

            if (dto.parentId) {
                await manager.increment(
                    Comment,
                    { id: dto.parentId },
                    'repliesCount',
                    1,
                );
            }

            return comment;
        });
    }

    async findById(id: string): Promise<Comment> {
        const comment = await this.commentRepo.findById(id);
        if (!comment) throw new NotFoundException('comment not found');
        return this.toPublic(comment);
    }

    async getTopLevel(
        postId: string,
        query: FeedQueryDto,
    ): Promise<CommentPage> {
        return this.paginate(query, async (cursor, limit) =>
            this.commentRepo.findTopLevelPage(postId, cursor, limit),
        );
    }

    async getReplies(
        commentId: string,
        query: FeedQueryDto,
    ): Promise<CommentPage> {
        return this.paginate(query, async (cursor, limit) =>
            this.commentRepo.findRepliesPage(commentId, cursor, limit),
        );
    }

    async remove(userId: string, commentId: string): Promise<void> {
        const comment = await this.commentRepo.findById(commentId);
        if (!comment) throw new NotFoundException('comment not found');
        if (comment.authorId !== userId)
            throw new ForbiddenException("you don't own this comment");
        await this.commentRepo.softDelete(commentId);
    }

    async like(userId: string, commentId: string): Promise<void> {
        await this.findById(commentId);
        await this.databaseService.transaction(async (manager) => {
            try {
                await manager.insert(CommentLike, { userId, commentId });
            } catch (err) {
                if ((err as { code?: string }).code === '23505') return;
                throw err;
            }
            await manager.increment(
                Comment,
                { id: commentId },
                'likesCount',
                1,
            );
        });
    }

    async unlike(userId: string, commentId: string): Promise<void> {
        await this.databaseService.transaction(async (manager) => {
            const result = await manager.delete(CommentLike, {
                userId,
                commentId,
            });
            if (result.affected && result.affected > 0) {
                await manager.decrement(
                    Comment,
                    { id: commentId },
                    'likesCount',
                    1,
                );
            }
        });
    }

    // masks deleted comments' content while keeping the row (and its
    // position in the tree) intact for reply threading
    private toPublic(comment: Comment): Comment {
        if (!comment.deletedAt) return comment;
        return { ...comment, content: '[deleted]' };
    }

    private encodeCursor(cursor: CommentCursor): string {
        return Buffer.from(
            `${cursor.createdAt.toISOString()}|${cursor.id}`,
        ).toString('base64');
    }

    private decodeCursor(cursor: string): CommentCursor {
        const [createdAt, id] = Buffer.from(cursor, 'base64')
            .toString('utf8')
            .split('|');
        return { createdAt: new Date(createdAt), id };
    }

    private async paginate(
        query: FeedQueryDto,
        fetch: (
            cursor: CommentCursor | null,
            limit: number,
        ) => Promise<Comment[]>,
    ): Promise<CommentPage> {
        const limit = query.limit ?? 20;
        const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
        const rows = await fetch(cursor, limit + 1);
        const hasMore = rows.length > limit;
        const data = (hasMore ? rows.slice(0, limit) : rows).map((c) =>
            this.toPublic(c),
        );
        const nextCursor = hasMore
            ? this.encodeCursor({
                  createdAt: rows[limit - 1].createdAt,
                  id: rows[limit - 1].id,
              })
            : null;
        return { data, nextCursor };
    }
}
