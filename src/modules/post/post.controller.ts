import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post as HttpPost,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PostService, FeedPage } from './post.service';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestMediaUploadDto } from './dto/request-media-upload.dto';
import { PostPrivacyGuard } from '../../common/guards/post-privacy.guard';

@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
export class PostController {
    constructor(private readonly postService: PostService) {}

    @HttpPost()
    async create(
        @CurrentUser('sub') userId: string,
        @Body() dto: CreatePostDto,
    ): Promise<Post> {
        return this.postService.create(userId, dto);
    }

    @Get('feed')
    async getFeed(
        @CurrentUser('sub') userId: string,
        @Query() query: FeedQueryDto,
    ): Promise<FeedPage> {
        return this.postService.getFeed(userId, query);
    }

    @UseGuards(PostPrivacyGuard)
    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Post> {
        return this.postService.findById(id);
    }

    @UseGuards(PostPrivacyGuard)
    @Get(':id/likes/count')
    async getLikesCount(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<{ count: number }> {
        const count = await this.postService.getLikesCount(id);
        return { count };
    }

    @Delete(':id')
    async remove(
        @CurrentUser('sub') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.postService.remove(userId, id);
    }

    @HttpPost(':postId/media/upload-url')
    async requestMediaUpload(
        @CurrentUser('sub') userId: string,
        @Param('postId', ParseUUIDPipe) postId: string,
        @Body() dto: RequestMediaUploadDto,
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
        return this.postService.requestMediaUpload(userId, postId, dto);
    }

    @HttpPost(':id/like')
    async like(
        @CurrentUser('sub') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.postService.like(userId, id);
    }

    @Delete(':id/like')
    async unlike(
        @CurrentUser('sub') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.postService.unlike(userId, id);
    }

    @HttpPost(':id/restore')
    async restore(
        @CurrentUser('sub') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.postService.restore(userId, id);
    }
}
