import {
    Controller,
    Get,
    NotFoundException,
    Patch,
    Body,
    UseGuards,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { User } from './entities/user.entity';
import { SetPrivateDto } from './dto/set-private.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { checkPrivacy } from 'src/common/decorators/check-privacy.decorator';
import { PrivacyGuard } from 'src/common/guards/privacy.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    async getMe(@CurrentUser('sub') userId: string): Promise<User> {
        const user = await this.userService.findById(userId);
        if (!user) throw new NotFoundException('User not found');
        return user;
    }
    @Patch('me')
    async updateMe(
        @CurrentUser('sub') userId: string,
        @Body() dto: UpdateUserDto,
    ): Promise<User> {
        return this.userService.updateProfile(userId, dto);
    }

    @Patch('me/privacy')
    async setPrivacy(
        @CurrentUser('sub') userId: string,
        @Body() dto: SetPrivateDto,
    ): Promise<User> {
        return this.userService.setPrivacy(userId, dto.isPrivate);
    }

    @Get(':userId')
    @checkPrivacy()
    @UseGuards(PrivacyGuard)
    async getProfile(
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<User | null> {
        return this.userService.findById(userId);
    }

    @Post('me/avatar/upload-url')
    getAvatarUploadUrl(
        @CurrentUser('sub') userId: string,
    ): ReturnType<UserService['getAvatarUploadParams']> {
        return this.userService.getAvatarUploadParams(userId);
    }
}
