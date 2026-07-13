import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

// text-only for now — media creation gets its own DTO/endpoint when the
// Cloudinary presigned-upload flow lands (caption becomes optional then,
// since media itself carries the content)
export class CreatePostDto {
    @ApiProperty()
    @IsString()
    @MaxLength(2200)
    caption: string;
}
