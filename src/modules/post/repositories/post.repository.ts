import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus } from '../entities/post.entity';
import { PostMedia } from '../entities/post-media.entity';
import { FollowStatus } from '../../follow/entities/follow.entity';

import { IsNull } from 'typeorm';
export interface FeedCursor {
    createdAt: Date;
    id: string;
}

@Injectable()
export class PostRepository {
    constructor(
        @InjectRepository(Post) private readonly repo: Repository<Post>,
        @InjectRepository(PostMedia)
        private readonly mediaRepo: Repository<PostMedia>,
    ) {}

    async create(data: Partial<Post>): Promise<Post> {
        const post = this.repo.create(data);
        return this.repo.save(post);
    }

    async createMedia(data: Partial<PostMedia>): Promise<PostMedia> {
        const media = this.mediaRepo.create(data);
        return this.mediaRepo.save(media);
    }

    async findById(id: string): Promise<Post | null> {
        return this.repo.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['media'],
        });
    }

    async getLikesCount(id: string): Promise<number | null> {
        const post = await this.repo.findOne({
            where: { id, deletedAt: IsNull() },
            select: ['id', 'likesCount'],
        });
        return post ? post.likesCount : null;
    }

    async findByIdIncludingDeleted(id: string): Promise<Post | null> {
        return this.repo.findOne({ where: { id }, relations: ['media'] });
    }

    async delete(id: string): Promise<void> {
        await this.repo.delete(id);
    }

    async softDelete(id: string): Promise<void> {
        await this.repo.softDelete(id);
    }

    async restore(id: string): Promise<void> {
        await this.repo.restore(id);
    }

    async findFeedPage(
        cursor: FeedCursor | null,
        limit: number,
        viewerId: string,
    ): Promise<Post[]> {
        const qb = this.repo
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.media', 'media')
            .innerJoin('post.author', 'author')
            .where('post.deletedAt IS NULL')
            .andWhere(
                `(author."isPrivate" = false
        OR author.id = :viewerId
        OR EXISTS (
          SELECT 1 FROM follows f
          WHERE f."followerId" = :viewerId
            AND f."followingId" = author.id
            AND f.status = :acceptedStatus
        ))`,
                { viewerId, acceptedStatus: FollowStatus.ACCEPTED },
            );

        if (cursor) {
            qb.andWhere(
                `(post.createdAt < :createdAt OR (post.createdAt = :createdAt AND post.id < :id))`,
                { createdAt: cursor.createdAt, id: cursor.id },
            );
        }

        return qb
            .orderBy('post.createdAt', 'DESC')
            .addOrderBy('post.id', 'DESC')
            .take(limit)
            .getMany();
    }

    async findMediaById(id: string): Promise<PostMedia | null> {
        return this.mediaRepo.findOne({ where: { id } });
    }

    async updateMediaStatus(
        id: string,
        data: Partial<PostMedia>,
    ): Promise<void> {
        await this.mediaRepo.update(id, data);
    }

    async findMediaByPost(postId: string): Promise<PostMedia[]> {
        return this.mediaRepo.find({ where: { postId } });
    }

    async updateStatus(id: string, status: PostStatus): Promise<void> {
        await this.repo.update(id, { status });
    }
}
