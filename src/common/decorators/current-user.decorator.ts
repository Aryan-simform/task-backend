import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

interface RequestWithUser {
    user: Record<string, unknown>;
}

export const CurrentUser = createParamDecorator(
    //data comes from jwtStrategy.validate()
    (data: string | undefined, ctx: ExecutionContext): unknown => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        return data ? request.user?.[data] : request.user;
    },
);
