import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { Brackets } from 'typeorm';

export interface CommentCursor {
    createdAt: Date;
    id: string;
}

@Injectable()
export class CommentRepository {
    constructor(
        @InjectRepository(Comment) private readonly repo: Repository<Comment>,
    ) {}

    async create(data: Partial<Comment>): Promise<Comment> {
        return this.repo.save(this.repo.create(data));
    }

    async findById(id: string): Promise<Comment | null> {
        return this.repo.findOne({ where: { id } });
    }

    async softDelete(id: string): Promise<void> {
        await this.repo.update(id, { deletedAt: new Date() });
    }

    // TODO — you've now done this pagination shape twice (Post feed, Follow
    // followers/following). This is the same tuple-comparison keyset pattern
    // against (createdAt, id), just filtered to `postId = :postId AND parentId IS NULL`,
    // ordered however you want top-level comments shown (newest-first to match
    // the other two, or oldest-first for a more natural reading order — your call).
    async findTopLevelPage(
        postId: string,
        cursor: CommentCursor | null,
        limit: number,
    ): Promise<Comment[]> {
        const queryBuilder = this.repo
            .createQueryBuilder('comment')
            .where('comment.postId=:postId', { postId })
            .andWhere('comment.parentId IS NULL');

        if (cursor) {
            queryBuilder.andWhere(
                new Brackets((qb) => {
                    qb.where('comment.createdAt < :createdAt', {
                        createdAt: cursor.createdAt,
                    }).orWhere(
                        '(comment.createdAt = :createdAt AND comment.id < :id)',
                        {
                            createdAt: cursor.createdAt,
                            id: cursor.id,
                        },
                    );
                }),
            );
        }

        return queryBuilder
            .orderBy('comment.createdAt', 'DESC')
            .addOrderBy('comment.id', 'DESC')
            .take(limit)
            .getMany();
    }

    // Same shape again, filtered to `parentId = :commentId` instead —
    // this is the "lazy-load replies on demand" endpoint rather than
    // fetching a full recursive tree in one go.
    async findRepliesPage(
        commentId: string,
        cursor: CommentCursor | null,
        limit: number,
    ): Promise<Comment[]> {
        const QueryBuilder = this.repo
            .createQueryBuilder('comment')
            .where('comment.parentId = :commentId', { commentId });

        if (cursor) {
            QueryBuilder.andWhere(
                new Brackets((qb) => {
                    qb.where('comment.createdAt < :createdAt', {
                        createdAt: cursor.createdAt,
                    }).orWhere(
                        '(comment.createdAt = :createdAt AND comment.id < :id)',
                        {
                            createdAt: cursor.createdAt,
                            id: cursor.id,
                        },
                    );
                }),
            );
        }

        return QueryBuilder.orderBy('comment.createdAt', 'DESC')
            .addOrderBy('comment.id', 'DESC')
            .take(limit)
            .getMany();
    }
}
