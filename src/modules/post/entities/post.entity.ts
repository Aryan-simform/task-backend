import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { PostMedia } from './post-media.entity';

export enum PostStatus {
    UPLOADING = 'uploading',
    PROCESSING = 'processing',
    READY = 'ready',
    FAILED = 'failed',
}

@Entity('posts')
export class Post {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'authorId' })
    author: User;

    @Column()
    authorId: string;

    @Column({ type: 'text', nullable: true })
    caption: string | null;

    // text posts are 'ready' immediately (nothing to process).
    // media posts will start 'uploading' once Cloudinary's presigned flow lands.
    @Column({ type: 'enum', enum: PostStatus, default: PostStatus.READY })
    status: PostStatus;

    @OneToMany(() => PostMedia, (media) => media.post, {
        cascade: true,
        eager: false,
    })
    media: PostMedia[];

    @Column({ default: 0 })
    likesCount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
