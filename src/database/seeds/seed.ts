import { AppDataSource } from '../data-source';
import * as argon2 from 'argon2';

import { User } from '../../modules/user/entities/user.entity';
import {
    Follow,
    FollowStatus,
} from '../../modules/follow/entities/follow.entity';
import { Post, PostStatus } from '../../modules/post/entities/post.entity';
import {
    PostMedia,
    MediaType,
    MediaStatus,
} from '../../modules/post/entities/post-media.entity';
import { PostLike } from '../../modules/post/entities/post-like.entity';
import { Comment } from '../../modules/comment/entities/comment.entity';
import { CommentLike } from '../../modules/comment/entities/comment-like.entity';

async function seed(): Promise<void> {
    const dataSource = await AppDataSource.initialize();

    try {
        const userRepo = dataSource.getRepository(User);

        const existingCount = await userRepo.count();

        if (existingCount > 0) {
            console.log(
                `Database already has ${existingCount} users. Skipping seed.`,
            );
            return;
        }

        await dataSource.transaction(async (manager) => {
            const passwordHash = await argon2.hash('Password@123');

            const usersRepository = manager.getRepository(User);
            const followRepository = manager.getRepository(Follow);
            const postRepository = manager.getRepository(Post);
            const mediaRepository = manager.getRepository(PostMedia);
            const postLikeRepository = manager.getRepository(PostLike);
            const commentRepository = manager.getRepository(Comment);
            const commentLikeRepository = manager.getRepository(CommentLike);

            const users = usersRepository.create([
                {
                    email: 'aryan@example.com',
                    username: 'aryan',
                    firstName: 'Aryan',
                    lastName: 'Mahida',
                    password: passwordHash,
                    bio: 'Building things.',
                    isPrivate: false,
                },
                {
                    email: 'priya@example.com',
                    username: 'priya',
                    firstName: 'Priya',
                    lastName: 'Shah',
                    password: passwordHash,
                    bio: 'Coffee & code.',
                    isPrivate: false,
                },
                {
                    email: 'rohan@example.com',
                    username: 'rohan',
                    firstName: 'Rohan',
                    lastName: 'Patel',
                    password: passwordHash,
                    bio: 'Private account.',
                    isPrivate: true,
                },
                {
                    email: 'sneha@example.com',
                    username: 'sneha',
                    firstName: 'Sneha',
                    lastName: 'Verma',
                    password: passwordHash,
                    bio: '',
                    isPrivate: false,
                },
                {
                    email: 'kunal@example.com',
                    username: 'kunal',
                    firstName: 'Kunal',
                    lastName: 'Desai',
                    password: passwordHash,
                    bio: 'Photographer.',
                    isPrivate: true,
                },
            ]);

            const savedUsers = await usersRepository.save(users);

            const [aryan, priya, rohan, sneha, kunal] = savedUsers;

            console.log('Seeded users');

            await followRepository.save([
                {
                    followerId: aryan.id,
                    followingId: priya.id,
                    status: FollowStatus.ACCEPTED,
                },
                {
                    followerId: aryan.id,
                    followingId: rohan.id,
                    status: FollowStatus.PENDING,
                },
                {
                    followerId: priya.id,
                    followingId: aryan.id,
                    status: FollowStatus.ACCEPTED,
                },
                {
                    followerId: sneha.id,
                    followingId: aryan.id,
                    status: FollowStatus.ACCEPTED,
                },
                {
                    followerId: sneha.id,
                    followingId: kunal.id,
                    status: FollowStatus.PENDING,
                },
                {
                    followerId: kunal.id,
                    followingId: priya.id,
                    status: FollowStatus.ACCEPTED,
                },
            ]);

            console.log('Seeded follows');

            const posts = postRepository.create([
                {
                    authorId: aryan.id,
                    caption: 'First post, just text.',
                    status: PostStatus.READY,
                },
                {
                    authorId: priya.id,
                    caption: 'Sunset from my balcony',
                    status: PostStatus.READY,
                },
                {
                    authorId: aryan.id,
                    caption: 'Carousel from the trip',
                    status: PostStatus.READY,
                },
                {
                    authorId: sneha.id,
                    caption: 'Still processing...',
                    status: PostStatus.UPLOADING,
                },
            ]);

            const [post1, post2, post3, post4] =
                await postRepository.save(posts);

            console.log('Seeded posts');

            await mediaRepository.save([
                {
                    postId: post2.id,
                    type: MediaType.IMAGE,
                    url: 'https://picsum.photos/seed/post2/800/600',
                    position: 0,
                    status: MediaStatus.READY,
                },
                {
                    postId: post3.id,
                    type: MediaType.IMAGE,
                    url: 'https://picsum.photos/seed/post3a/800/600',
                    position: 0,
                    status: MediaStatus.READY,
                },
                {
                    postId: post3.id,
                    type: MediaType.IMAGE,
                    url: 'https://picsum.photos/seed/post3b/800/600',
                    position: 1,
                    status: MediaStatus.READY,
                },
                {
                    postId: post4.id,
                    type: MediaType.IMAGE,
                    url: '',
                    position: 0,
                    status: MediaStatus.UPLOADING,
                },
            ]);

            console.log('Seeded media');

            await postLikeRepository.save([
                {
                    userId: priya.id,
                    postId: post1.id,
                },
                {
                    userId: sneha.id,
                    postId: post1.id,
                },
                {
                    userId: aryan.id,
                    postId: post2.id,
                },
            ]);

            await manager.increment(Post, { id: post1.id }, 'likesCount', 2);
            await manager.increment(Post, { id: post2.id }, 'likesCount', 1);

            console.log('Seeded post likes');

            const [comment1] = await commentRepository.save(
                commentRepository.create([
                    {
                        postId: post1.id,
                        authorId: priya.id,
                        content: 'Nice one!',
                        parentId: null,
                    },
                ]),
            );

            await commentRepository.save(
                commentRepository.create([
                    {
                        postId: post1.id,
                        authorId: sneha.id,
                        content: 'Agreed',
                        parentId: null,
                    },
                ]),
            );

            const [reply1] = await commentRepository.save(
                commentRepository.create([
                    {
                        postId: post1.id,
                        authorId: aryan.id,
                        content: 'Thanks!',
                        parentId: comment1.id,
                    },
                ]),
            );

            await manager.increment(
                Comment,
                { id: comment1.id },
                'repliesCount',
                1,
            );

            await commentRepository.save(
                commentRepository.create([
                    {
                        postId: post1.id,
                        authorId: priya.id,
                        content: 'Anytime',
                        parentId: reply1.id,
                    },
                ]),
            );

            await manager.increment(
                Comment,
                { id: reply1.id },
                'repliesCount',
                1,
            );

            console.log('Seeded comments');

            await commentLikeRepository.save([
                {
                    userId: sneha.id,
                    commentId: comment1.id,
                },
            ]);

            await manager.increment(
                Comment,
                { id: comment1.id },
                'likesCount',
                1,
            );

            console.log('Seeded comment likes');
        });

        console.log('Seed complete.');
    } finally {
        await dataSource.destroy();
    }
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
