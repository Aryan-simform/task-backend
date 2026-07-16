import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { MediaType } from '../entities/post-media.entity';

export class RequestMediaUploadDto {
    @ApiProperty({ enum: MediaType })
    @IsEnum(MediaType)
    type: MediaType;

    @ApiProperty()
    @IsInt()
    @Min(0)
    position: number;
}
