import { PartialType, PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// export class UpdateUserDto extends PartialType(CreateUserDto) {} // this is very wrong this makes all the fileds updateable even id, password and username and all which is a big no no  so use PickType

export class UpdateUserDto extends PartialType(
    PickType(CreateUserDto, [
        'firstName',
        'lastName',
        'bio',
        'avatarUrl',
    ] as const),
) {}
