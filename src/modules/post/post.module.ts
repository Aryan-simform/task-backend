import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostRepository } from './repositories/post.repository';
import { Post } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostLike } from './entities/post-like.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { DatabaseModule } from '../../database/database.module';
import { PostPrivacyGuard } from '../../common/guards/post-privacy.guard';
import { UserModule } from '../user/user.module';
import { FollowModule } from '../follow/follow.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Post, PostMedia, PostLike]),
        CloudinaryModule,
        DatabaseModule,
        UserModule,
        FollowModule,
    ],
    controllers: [PostController],
    providers: [PostService, PostRepository, PostPrivacyGuard],
    exports: [PostService, PostRepository],
})
export class PostModule {}
