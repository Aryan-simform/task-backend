import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @Column()
    userId!: string;

    // never store the raw token — only its hash
    @Column()
    tokenHash!: string;

    @Column()
    expiresAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    revokedAt!: Date | null;

    @CreateDateColumn()
    createdAt!: Date;
}
