import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetPrivateDto {
    @ApiProperty()
    @IsBoolean()
    isPrivate: boolean;
}
