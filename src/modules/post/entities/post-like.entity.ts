import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    Unique,
    JoinColumn,
} from 'typeorm';
import { Post } from './post.entity';

import { User } from '../../user/entities/user.entity';
@Entity('post_likes')
@Unique(['userId', 'postId'])
export class PostLike {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column('uuid')
    userId: string;

    @ManyToOne(() => Post, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post: Post;

    @Column('uuid')
    postId: string;

    @CreateDateColumn()
    createdAt: Date;
}
