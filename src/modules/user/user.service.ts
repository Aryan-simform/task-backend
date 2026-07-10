import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

interface PostgresError {
    code: string;
}

function isPostgresError(err: unknown): err is PostgresError {
    return typeof err === 'object' && err !== null && 'code' in err;
}

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    async create(dto: CreateUserDto & { password: string }): Promise<User> {
        try {
            const user = this.userRepo.create(dto);
            return await this.userRepo.save(user);
        } catch (err) {
            if (isPostgresError(err) && err.code === '23505') {
                // postgres unique_violation
                throw new ConflictException('email or username already in use');
            }
            throw err;
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepo.findOne({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return this.userRepo.findOne({ where: { id } });
    }

    async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findById(userId);
        if (!user) throw new NotFoundException('user nahi mila');
        await this.userRepo.update(userId, dto);
        return this.findById(userId) as Promise<User>;
    }

    async setPrivacy(userId: string, isPrivate: boolean): Promise<User> {
        const user = await this.findById(userId);
        if (!user) throw new NotFoundException('User not found');
        await this.userRepo.update(userId, { isPrivate });
        return this.findById(userId) as Promise<User>;
    }

    getAvatarUploadParams(userId: string): {
        uploadUrl: string;
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        notificationUrl: string;
        publicId: string;
    } {
        // Only sign the fields the frontend will actually send in the upload FormData.
        // notification_url must NOT be in paramsToSign unless the client sends it too —
        // Cloudinary recomputes the signature from the uploaded fields and rejects if they differ.
        // folder is omitted because public_id already carries the full path (avatars/{userId}).
        const signed = this.cloudinaryService.generateSignedUploadParams({
            public_id: `avatars/${userId}`,
            overwrite: true,
            invalidate: true,
        });

        return {
            uploadUrl: `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
            ...signed,
            publicId: `avatars/${userId}`,
        };
    }

    async updateAvatarUrl(userId: string, url: string): Promise<void> {
        await this.userRepo.update(userId, { avatarUrl: url });
    }
}
