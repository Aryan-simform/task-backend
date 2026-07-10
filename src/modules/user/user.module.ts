import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PrivacyGuard } from 'src/common/guards/privacy.guard.ts.guard';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
    imports: [TypeOrmModule.forFeature([User]), CloudinaryModule],
    controllers: [UserController],
    providers: [UserService, PrivacyGuard],
    exports: [UserService, PrivacyGuard],
})
export class UserModule {}
