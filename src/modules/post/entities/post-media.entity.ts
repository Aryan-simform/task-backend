import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
} from 'typeorm';
import { Post } from './post.entity';

export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
}

export enum MediaStatus {
    UPLOADING = 'uploading',
    FAILED = 'failed',
    READY = 'ready',
}

@Entity('post_media')
export class PostMedia {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Post, (post) => post.media, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post: Post;

    @Column()
    postId: string;

    @Column({ type: 'enum', enum: MediaType })
    type: MediaType;

    @Column({
        type: 'text',
        nullable: true,
    })
    url: string | null;

    @Column({ type: 'text', nullable: true })
    thumbnailUrl: string | null;

    @Column({ type: 'enum', enum: MediaStatus, default: MediaStatus.UPLOADING })
    status: MediaStatus;

    // carousel ordering — first image in an Instagram-style multi-image post is position 0
    @Column({ default: 0 })
    position: number;

    @CreateDateColumn()
    createdAt: Date;
}
