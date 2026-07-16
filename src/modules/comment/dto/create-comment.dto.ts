import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
    @ApiProperty()
    @IsString()
    @MaxLength(2200)
    content: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    parentId?: string;
}
