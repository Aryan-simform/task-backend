import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PostRepository } from '../../modules/post/repositories/post.repository';
import { UserService } from '../../modules/user/user.service';
import { FollowService } from '../../modules/follow/follow.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    };
    params: {
        id: string;
    };
}

@Injectable()
export class PostPrivacyGuard implements CanActivate {
    constructor(
        private readonly postRepo: PostRepository,
        private readonly userService: UserService,
        private readonly followService: FollowService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();
        const postId: string = request.params.id;
        const requesterId: string = request.user.sub;

        const post = await this.postRepo.findById(postId);
        if (!post) throw new NotFoundException('Post not found');
        const author = await this.userService.findById(post.authorId);
        if (!author) throw new NotFoundException('Author not found');
        if (!author.isPrivate) return true;
        if (author.id === requesterId) return true;

        const isFollower = await this.followService.isAcceptedFollower(
            requesterId,
            author.id,
        );
        if (isFollower) return true;

        throw new ForbiddenException('account private please follow');
    }
}
