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

@Module({
    imports: [
        TypeOrmModule.forFeature([Post, PostMedia, PostLike]),
        CloudinaryModule,
        DatabaseModule,
    ],
    controllers: [PostController],
    providers: [PostService, PostRepository],
    exports: [PostService, PostRepository],
})
export class PostModule {}
