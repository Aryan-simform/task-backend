import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

export const CHECK_PRIVACY_KEY = 'checkPrivacy';

export const checkPrivacy = (): CustomDecorator =>
    SetMetadata(CHECK_PRIVACY_KEY, true);
