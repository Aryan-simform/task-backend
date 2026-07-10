import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ unique: true })
    username!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Exclude()
    @Column()
    password!: string;

    @Column({ nullable: true })
    bio!: string;

    @Column({ nullable: true })
    avatarUrl!: string;

    @Column({ default: false })
    isPrivate!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
