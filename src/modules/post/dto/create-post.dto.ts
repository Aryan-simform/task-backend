import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    MaxLength,
    IsInt,
    Min,
    Max,
    IsOptional,
} from 'class-validator';

export class CreatePostDto {
    @ApiProperty()
    @IsString()
    @MaxLength(2200)
    caption: string;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(10)
    mediaCount?: number = 0;
}
