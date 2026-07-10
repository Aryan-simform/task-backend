import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsOptional,
    IsString,
    Matches,
    MinLength,
    IsUrl,
} from 'class-validator';
export class CreateUserDto {
    private static pattern =
        /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @MinLength(3)
    username: string;

    @ApiProperty()
    @IsString()
    @MinLength(3)
    firstName: string;

    @ApiProperty()
    @IsString()
    @MinLength(3)
    lastName: string;

    @ApiProperty()
    @IsString()
    @MinLength(8)
    @Matches(CreateUserDto.pattern, {
        message: 'password too weak',
    })
    password: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    bio?: string;

    @ApiProperty()
    @IsUrl()
    @IsOptional()
    avatarUrl?: string;
}
