import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { CommentRepository } from './repositories/comment.repository';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PostModule } from '../post/post.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Comment, CommentLike]),
        PostModule,
        DatabaseModule,
    ],
    controllers: [CommentController],
    providers: [CommentService, CommentRepository],
})
export class CommentModule {}
