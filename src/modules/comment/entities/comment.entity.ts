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
import { Post } from '../../post/entities/post.entity';

@Entity('comments')
export class Comment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    postId: string;

    @ManyToOne(() => Post, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post: Post;

    @Column()
    authorId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'authorId' })
    author: User;

    @Column({ nullable: true })
    parentId: string | null;

    @ManyToOne(() => Comment, (comment) => comment.replies, {
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'parentId' })
    parent: Comment | null;

    @OneToMany(() => Comment, (comment) => comment.parent)
    replies: Comment[];

    @Column({ type: 'text' })
    content: string;

    @Column({ default: 0 })
    likesCount: number;

    @Column({ default: 0 })
    repliesCount: number;

    @Column({ type: 'timestamptz', nullable: true })
    deletedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
