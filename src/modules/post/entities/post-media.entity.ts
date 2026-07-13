import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
} from 'typeorm';
import { Post } from './post.entity';

export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
}

@Entity('post_media')
export class PostMedia {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Post, (post) => post.media, { onDelete: 'CASCADE' })
    post: Post;

    @Column()
    postId: string;

    @Column({ type: 'enum', enum: MediaType })
    type: MediaType;

    @Column()
    url: string;

    @Column({ nullable: true })
    thumbnailUrl: string | null;

    // carousel ordering — first image in an Instagram-style multi-image post is position 0
    @Column({ default: 0 })
    position: number;

    @CreateDateColumn()
    createdAt: Date;
}
