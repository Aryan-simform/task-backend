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
    ) {}

    async follow(followerId: string, followingId: string): Promise<Follow> {
        if (followingId === followerId)
            throw new BadRequestException("Can't follow yourself", '');
        const target = await this.userService.findById(followingId);
        if (!target) throw new NotFoundException('User not found');

        const status = target.isPrivate
            ? FollowStatus.PENDING
            : FollowStatus.ACCEPTED;

        try {
            return await this.followRepo.create({
                followerId,
                followingId,
                status,
            });
        } catch (err) {
            if ((err as { code?: string }).code === '23505')
                throw new ConflictException('already follwoing or requested');
            throw err;
        }
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await this.followRepo.delete(followerId, followingId);
    }

    async accept(targetUserId: string, requesterId: string): Promise<void> {
        const follow = await this.followRepo.findOne(requesterId, targetUserId);
        if (!follow) throw new NotFoundException('follow request not found');
        if (follow.status === FollowStatus.ACCEPTED) return; // idempotent
        await this.followRepo.updateStatus(follow.id, FollowStatus.ACCEPTED);
    }

    async reject(targetUserId: string, requesterId: string): Promise<void> {
        const follow = await this.followRepo.findOne(requesterId, targetUserId);
        if (!follow) throw new NotFoundException('follow request not found');
        await this.followRepo.delete(requesterId, targetUserId);
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
