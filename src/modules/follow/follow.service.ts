import {
    Injectable,
    Inject,
    BadRequestException,
    ConflictException,
    NotFoundException,
    forwardRef,
} from '@nestjs/common';
import { FollowRepository } from './repositories/follow.repository';
import { Follow, FollowStatus } from './entities/follow.entity';
import { UserService } from '../user/user.service';
import { FollowCursor } from './interfaces/followCursor.interface';
import { FeedQueryDto } from '../post/dto/feed-query.dto';
import { CacheService } from '../../common/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache.constants';

export interface FollowPage {
    data: Follow[];
    nextCursor: string | null;
}

@Injectable()
export class FollowService {
    constructor(
        private readonly followRepo: FollowRepository,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        private readonly cacheService: CacheService,
    ) {}

    private async invalidateFollowCounts(
        followerId: string,
        followingId: string,
    ): Promise<void> {
        await Promise.all([
            this.cacheService.del(cacheKeys.followerCount(followingId)),
            this.cacheService.del(cacheKeys.followingCount(followerId)),
        ]);
    }

    async follow(followerId: string, followingId: string): Promise<Follow> {
        if (followingId === followerId)
            throw new BadRequestException("Can't follow yourself", '');
        const target = await this.userService.findById(followingId);
        if (!target) throw new NotFoundException('User not found');

        const status = target.isPrivate
            ? FollowStatus.PENDING
            : FollowStatus.ACCEPTED;

        try {
            const follow = await this.followRepo.create({
                followerId,
                followingId,
                status,
            });
            // only an immediate accept (public target) changes the accepted
            // counts — a pending request doesn't, but invalidating anyway is
            // a cheap no-op and keeps this branch simple.
            if (status === FollowStatus.ACCEPTED)
                await this.invalidateFollowCounts(followerId, followingId);
            return follow;
        } catch (err) {
            if ((err as { code?: string }).code === '23505')
                throw new ConflictException('already follwoing or requested');
            throw err;
        }
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await this.followRepo.delete(followerId, followingId);
        await this.invalidateFollowCounts(followerId, followingId);
    }

    async accept(targetUserId: string, requesterId: string): Promise<void> {
        const follow = await this.followRepo.findOne(requesterId, targetUserId);
        if (!follow) throw new NotFoundException('follow request not found');
        if (follow.status === FollowStatus.ACCEPTED) return; // idempotent
        await this.followRepo.updateStatus(follow.id, FollowStatus.ACCEPTED);
        await this.invalidateFollowCounts(requesterId, targetUserId);
    }

    async reject(targetUserId: string, requesterId: string): Promise<void> {
        const follow = await this.followRepo.findOne(requesterId, targetUserId);
        if (!follow) throw new NotFoundException('follow request not found');
        await this.followRepo.delete(requesterId, targetUserId);
        await this.invalidateFollowCounts(requesterId, targetUserId);
    }

    async getFollowerCount(userId: string): Promise<number> {
        const cacheKey = cacheKeys.followerCount(userId);
        const cached = await this.cacheService.get<number>(cacheKey);
        if (cached !== null) return cached;

        const count = await this.followRepo.countFollowers(userId);
        await this.cacheService.set(cacheKey, count, CACHE_TTL.FOLLOW_COUNT);
        return count;
    }

    async getFollowingCount(userId: string): Promise<number> {
        const cacheKey = cacheKeys.followingCount(userId);
        const cached = await this.cacheService.get<number>(cacheKey);
        if (cached !== null) return cached;

        const count = await this.followRepo.countFollowing(userId);
        await this.cacheService.set(cacheKey, count, CACHE_TTL.FOLLOW_COUNT);
        return count;
    }

    // used by PrivacyGuard — closes the TODO from earlier
    async isAcceptedFollower(
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        return this.followRepo.existsAccepted(followerId, followingId);
    }

    private encodeCursor(cursor: FollowCursor): string {
        return Buffer.from(
            `${cursor.createdAt.toISOString()}|${cursor.id}`,
        ).toString('base64');
    }

    private decodeCursor(cursor: string): FollowCursor {
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

    async getFollowers(
        userId: string,
        query: FeedQueryDto,
    ): Promise<FollowPage> {
        const limit = query.limit ?? 20;

        const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

        const rows = await this.followRepo.findFollowersPage(
            userId,
            cursor,
            limit + 1,
        );

        const hasMore = rows.length > limit;

        const data = hasMore ? rows.slice(0, limit) : rows;

        const nextCursor = hasMore
            ? this.encodeCursor({
                  createdAt: data[data.length - 1].createdAt,
                  id: data[data.length - 1].id,
              })
            : null;

        return {
            data,
            nextCursor,
        };
    }

    async getFollowing(
        userId: string,
        query: FeedQueryDto,
    ): Promise<FollowPage> {
        const limit = query.limit ?? 20;

        const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

        const rows = await this.followRepo.findFollowingPage(
            userId,
            cursor,
            limit + 1,
        );

        const hasMore = rows.length > limit;

        const data = hasMore ? rows.slice(0, limit) : rows;

        const nextCursor = hasMore
            ? this.encodeCursor({
                  createdAt: data[data.length - 1].createdAt,
                  id: data[data.length - 1].id,
              })
            : null;

        return {
            data,
            nextCursor,
        };
    }
}
