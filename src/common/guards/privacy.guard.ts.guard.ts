// common/guards/privacy.guard.ts
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CHECK_PRIVACY_KEY } from '../decorators/check-privacy.decorator';
import { UserService } from '../../modules/user/user.service';

interface AuthenticatedRequest extends Request {
    params: Record<string, string>;
    user?: { sub: string };
}

@Injectable()
export class PrivacyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userService: UserService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiresCheck = this.reflector.getAllAndOverride<boolean>(
            CHECK_PRIVACY_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!requiresCheck) return true;

        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();
        const targetUserId: string = request.params.userId;
        const requesterId: string | undefined = request.user?.sub;

        const targetUser = await this.userService.findById(targetUserId);
        if (!targetUser) throw new NotFoundException('user not found');

        if (!targetUser.isPrivate) return true; // public account
        if (targetUser.id === requesterId) return true; // viewing your own account

        // TODO once FollowModule exists (Phase 5):
        // const isFollower = await this.followService.isAcceptedFollower(requesterId, targetUserId);
        // if (isFollower) return true;

        throw new ForbiddenException('this account is private');
    }
}
