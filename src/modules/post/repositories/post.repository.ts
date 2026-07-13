import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';

export interface FeedCursor {
    createdAt: Date;
    id: string;
}

@Injectable()
export class PostRepository {
    constructor(
        @InjectRepository(Post) private readonly repo: Repository<Post>,
    ) {}

    async create(data: Partial<Post>): Promise<Post> {
        const post = this.repo.create(data);
        return this.repo.save(post);
    }

    async findById(id: string): Promise<Post | null> {
        return this.repo.findOne({ where: { id }, relations: ['media'] });
    }

    async delete(id: string): Promise<void> {
        await this.repo.delete(id);
    }

    async findFeedPage(
        cursor: FeedCursor | null,
        limit: number,
    ): Promise<Post[]> {
        const queryBuilder = this.repo
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.media', 'media');
        if (cursor) {
            queryBuilder.andWhere(
                '(post.createdAt,post.id)< (:createdAt,:id)',
                {
                    createdAt: cursor.createdAt,
                    id: cursor.id,
                },
            );
        }
        return queryBuilder
            .orderBy('post.createAt', 'DESC')
            .addOrderBy('post.id', 'DESC')
            .take(limit)
            .getMany();
    }
}
