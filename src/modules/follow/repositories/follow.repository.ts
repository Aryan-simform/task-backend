import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Follow, FollowStatus } from '../entities/follow.entitiy';
import { FollowCursor } from '../interfaces/followCursor.interface';

@Injectable()
export class FollowRepository {
    constructor(
        @InjectRepository(Follow) private readonly repo: Repository<Follow>,
    ) {}

    async create(data: Partial<Follow>): Promise<Follow> {
        return this.repo.save(this.repo.create(data));
    }

    async findOne(
        followerId: string,
        followingId: string,
    ): Promise<Follow | null> {
        return this.repo.findOne({ where: { followerId, followingId } });
    }
    async updateStatus(id: string, status: FollowStatus): Promise<void> {
        await this.repo.update(id, { status });
    }

    //implies rejected here
    async delete(followerId: string, followingId: string): Promise<void> {
        await this.repo.delete({ followerId, followingId });
    }

    async existsAccepted(
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        const count = await this.repo.count({
            where: { followerId, followingId, status: FollowStatus.ACCEPTED },
        });
        return count > 0;
    }

    private applyCursor(
        qb: SelectQueryBuilder<Follow>,
        cursor: FollowCursor | null,
    ): SelectQueryBuilder<Follow> {
        if (!cursor) return qb;

        return qb.andWhere(
            `(follow.createdAt < :createdAt
          OR (
              follow.createdAt = :createdAt
              AND follow.id < :id
          ))`,
            {
                createdAt: cursor.createdAt,
                id: cursor.id,
            },
        );
    }

    private async applyPagination(
        qb: SelectQueryBuilder<Follow>,
        cursor: FollowCursor | null,
        limit: number,
    ): Promise<Follow[]> {
        return this.applyCursor(qb, cursor)
            .orderBy('follow.createdAt', 'DESC')
            .addOrderBy('follow.id', 'DESC')
            .take(limit)
            .getMany();
    }

    async findFollowersPage(
        userId: string,
        cursor: FollowCursor | null,
        limit: number,
    ): Promise<Follow[]> {
        const qb = this.repo
            .createQueryBuilder('follow')
            .leftJoinAndSelect('follow.follower', 'follower')
            .where('follow.followingId = :userId', { userId })
            .andWhere('follow.status = :status', {
                status: FollowStatus.ACCEPTED,
            });

        return this.applyPagination(qb, cursor, limit);
    }

    async findFollowingPage(
        userId: string,
        cursor: FollowCursor | null,
        limit: number,
    ): Promise<Follow[]> {
        const qb = this.repo
            .createQueryBuilder('follow')
            .leftJoinAndSelect('follow.following', 'following')
            .where('follow.followerId = :userId', { userId })
            .andWhere('follow.status = :status', {
                status: FollowStatus.ACCEPTED,
            });

        return this.applyPagination(qb, cursor, limit);
    }
}
