import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    Query,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FollowService, FollowPage } from './follow.service';
import { Follow } from './entities/follow.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FeedQueryDto } from '../post/dto/feed-query.dto';

@ApiTags('follow')
@ApiBearerAuth()
@Controller('follow')
export class FollowController {
    constructor(private readonly followService: FollowService) {}

    @Post(':userId')
    async follow(
        @CurrentUser('sub') me: string,
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<Follow> {
        return this.followService.follow(me, userId);
    }

    @Delete(':userId')
    async unfollow(
        @CurrentUser('sub') me: string,
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<void> {
        return this.followService.unfollow(me, userId);
    }

    @Post(':userId/accept')
    async accept(
        @CurrentUser('sub') me: string,
        @Param('userId', ParseUUIDPipe) requesterId: string,
    ): Promise<void> {
        return this.followService.accept(me, requesterId);
    }

    @Post(':userId/reject')
    async reject(
        @CurrentUser('sub') me: string,
        @Param('userId', ParseUUIDPipe) requesterId: string,
    ): Promise<void> {
        return this.followService.reject(me, requesterId);
    }

    @Get('followers/:userId')
    async getFollowers(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Query() query: FeedQueryDto,
    ): Promise<FollowPage> {
        return this.followService.getFollowers(userId, query);
    }

    @Get('followers/:userId/count')
    async getFollowerCount(
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<{ count: number }> {
        return { count: await this.followService.getFollowerCount(userId) };
    }

    @Get('following/:userId')
    async getFollowing(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Query() query: FeedQueryDto,
    ): Promise<FollowPage> {
        return this.followService.getFollowing(userId, query);
    }

    @Get('following/:userId/count')
    async getFollowingCount(
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<{ count: number }> {
        return { count: await this.followService.getFollowingCount(userId) };
    }
}
