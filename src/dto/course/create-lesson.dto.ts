import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonDto {
  @ApiProperty({ description: 'Course ID this lesson belongs to' })
  @IsUUID()
  courseId!: string;

  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Lesson description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Day number in course (1, 2, 3, etc.)', minimum: 1 })
  @IsNumber()
  @Min(1)
  dayNumber!: number;

  @ApiProperty({ description: 'Lesson duration in minutes', minimum: 1 })
  @IsNumber()
  @Min(1)
  duration!: number;

  @ApiPropertyOptional({ description: 'Practice song ID from songs table' })
  @IsOptional()
  @ValidateIf((o) => o.practiceSongId && o.practiceSongId.trim() !== '')
  @IsUUID()
  practiceSongId?: string;

  @ApiPropertyOptional({ description: 'Practice song title (fallback if song not in system)' })
  @IsOptional()
  @IsString()
  practiceSongTitle?: string;

  @ApiProperty({ description: 'Detailed lesson instructions' })
  @IsString()
  instructions!: string;

  @ApiPropertyOptional({ description: 'Optional video lesson URL' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Optional audio guide URL' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'Whether lesson is published', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Whether lesson is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Lesson sort order', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// Backward compatibility
export { CreateLessonDto as CreateVocalLessonDto };
