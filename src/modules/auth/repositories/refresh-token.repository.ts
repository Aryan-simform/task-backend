import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
    constructor(
        @InjectRepository(RefreshToken)
        private readonly repo: Repository<RefreshToken>,
    ) {}

    async create(data: Partial<RefreshToken>): Promise<RefreshToken> {
        return this.repo.save(this.repo.create(data));
    }

    async findActiveByUser(userId: string): Promise<RefreshToken[]> {
        return this.repo.find({
            where: {
                userId,
                revokedAt: IsNull(),
                expiresAt: MoreThan(new Date()),
            },
        });
    }
    async findById(id: string): Promise<RefreshToken | null> {
        return this.repo.findOne({ where: { id } });
    }

    async revoke(id: string): Promise<void> {
        await this.repo.update(id, { revokedAt: new Date() });
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await this.repo.update(
            { userId, revokedAt: IsNull() },
            { revokedAt: new Date() },
        );
    }
}
