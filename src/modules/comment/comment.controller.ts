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
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FeedQueryDto } from '../post/dto/feed-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommentPage } from './comment.service';
import { Comment } from './entities/comment.entity';

@ApiTags('comments')
@ApiBearerAuth()
@Controller()
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    @HttpPost('posts/:postId/comments')
    async create(
        @CurrentUser('sub') userId: string,
        @Param('postId', ParseUUIDPipe) postId: string,
        @Body() dto: CreateCommentDto,
    ): Promise<Comment> {
        return this.commentService.create(userId, postId, dto);
    }

    @Get('posts/:postId/comments')
    async getTopLevel(
        @Param('postId', ParseUUIDPipe) postId: string,
        @Query() query: FeedQueryDto,
    ): Promise<CommentPage> {
        return this.commentService.getTopLevel(postId, query);
    }

    @Get('comments/:commentId/replies')
    async getReplies(
        @Param('commentId', ParseUUIDPipe) commentId: string,
        @Query() query: FeedQueryDto,
    ): Promise<CommentPage> {
        return this.commentService.getReplies(commentId, query);
    }

    @Delete('comments/:commentId')
    async remove(
        @CurrentUser('sub') userId: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
    ): Promise<void> {
        return this.commentService.remove(userId, commentId);
    }

    @HttpPost('comments/:commentId/like')
    async like(
        @CurrentUser('sub') userId: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
    ): Promise<void> {
        return this.commentService.like(userId, commentId);
    }

    @Delete('comments/:commentId/like')
    async unlike(
        @CurrentUser('sub') userId: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
    ): Promise<void> {
        return this.commentService.unlike(userId, commentId);
    }
}
