// modules/follow/follow.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from './entities/follow.entitiy';
import { FollowRepository } from './repositories/follow.repository';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { UserModule } from '../user/user.module';

@Module({
    imports: [TypeOrmModule.forFeature([Follow]), forwardRef(() => UserModule)],
    controllers: [FollowController],
    providers: [FollowService, FollowRepository],
    exports: [FollowService],
})
export class FollowModule {}
