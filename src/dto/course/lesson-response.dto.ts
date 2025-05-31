import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CourseBasicDto {
  @ApiProperty({ description: 'Course ID' })
  id!: string;

  @ApiProperty({ description: 'Course title' })
  title!: string;

  @ApiProperty({ description: 'Course level' })
  level!: string;
}

export class PracticeSongDto {
  @ApiProperty({ description: 'Song ID' })
  id!: string;

  @ApiProperty({ description: 'Song title' })
  title!: string;

  @ApiProperty({ description: 'Artist name' })
  artist!: string;

  @ApiPropertyOptional({ description: 'Song key' })
  key?: string;

  @ApiPropertyOptional({ description: 'Song tempo' })
  tempo?: number;
}

export class LessonResponseDto {
  @ApiProperty({ description: 'Lesson ID' })
  id!: string;

  @ApiProperty({ description: 'Course ID this lesson belongs to' })
  courseId!: string;

  @ApiProperty({ description: 'Lesson title' })
  title!: string;

  @ApiProperty({ description: 'Lesson description' })
  description!: string;

  @ApiProperty({ description: 'Day number in course' })
  dayNumber!: number;

  @ApiProperty({ description: 'Lesson duration in minutes' })
  duration!: number;

  @ApiPropertyOptional({ description: 'Practice song ID' })
  practiceSongId?: string;

  @ApiPropertyOptional({ description: 'Practice song title' })
  practiceSongTitle?: string;

  @ApiProperty({ description: 'Detailed lesson instructions' })
  instructions!: string;

  @ApiPropertyOptional({ description: 'Video lesson URL' })
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Audio guide URL' })
  audioUrl?: string;

  @ApiProperty({ description: 'Whether lesson is published' })
  isPublished!: boolean;

  @ApiProperty({ description: 'Whether lesson is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Lesson sort order' })
  sortOrder!: number;

  @ApiProperty({ description: 'Lesson creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Lesson last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Course information (if included)' })
  course?: CourseBasicDto;

  @ApiPropertyOptional({ description: 'Practice song information (if included)' })
  practiceSong?: PracticeSongDto;
}

// Backward compatibility
export { LessonResponseDto as VocalLessonResponseDto };
export { CourseBasicDto as VocalCourseBasicDto };
