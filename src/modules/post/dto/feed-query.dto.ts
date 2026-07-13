import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FeedQueryDto {
    // opaque cursor string, not a raw id — see PostService.getFeed for why
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 20;
}
