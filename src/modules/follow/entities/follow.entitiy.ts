import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
    Check,
} from 'typeorm';

import { User } from 'src/modules/user/entities/user.entity';

export enum FollowStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted', //No need for rejected as it will break the Unique constraint on Entity.
}

@Entity('follows')
@Unique(['followerId', 'followingId'])
@Check('following <>followingId')
export class Follow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    following: User;

    @Column()
    followingId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    follower: User;

    @Column()
    followerId: string;

    @Column({ type: 'enum', enum: FollowStatus })
    status: FollowStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
