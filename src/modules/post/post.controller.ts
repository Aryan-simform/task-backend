import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post as HttpPost,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PostService, FeedPage } from './post.service';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
    async getFeed(@Query() query: FeedQueryDto): Promise<FeedPage> {
        return this.postService.getFeed(query);
    }

    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Post> {
        return this.postService.findById(id);
    }

    @Delete(':id')
    async remove(
        @CurrentUser('sub') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.postService.remove(userId, id);
    }
}
