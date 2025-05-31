import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel } from './create-course.dto';

export class CourseResponseDto {
  @ApiProperty({ description: 'Course ID' })
  id!: string;

  @ApiProperty({ description: 'Course title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Course subtitle' })
  subtitle?: string;

  @ApiProperty({ description: 'Course description' })
  description!: string;

  @ApiProperty({
    description: 'Course difficulty level',
    enum: CourseLevel
  })
  level!: CourseLevel;

  @ApiProperty({
    description: 'Course type',
    example: ''
  })
  courseType!: string;

  @ApiPropertyOptional({ description: 'Course cover image URL' })
  imageUrl?: string;

  @ApiProperty({ description: 'Total days in course' })
  totalDays!: number;

  @ApiProperty({ description: 'Total lessons in course' })
  totalLessons!: number;

  @ApiProperty({ description: 'Estimated hours to complete' })
  estimatedHours!: number;

  @ApiProperty({ description: 'Whether course is published' })
  isPublished!: boolean;

  @ApiProperty({ description: 'Whether course is featured' })
  isFeatured!: boolean;

  @ApiProperty({ description: 'Whether course is active' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Course price (null for free courses)' })
  price?: number;

  @ApiProperty({ description: 'Course view count' })
  viewCount!: number;

  @ApiProperty({ description: 'Course enrollment count' })
  enrollmentCount!: number;

  @ApiProperty({ description: 'Course completion rate (0-100)' })
  completionRate!: number;

  @ApiProperty({ description: 'Average course rating (0-5)' })
  averageRating!: number;

  @ApiProperty({ description: 'Number of ratings' })
  ratingCount!: number;

  @ApiProperty({ description: 'Course creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Course last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Course lessons (if included)' })
  lessons?: LessonSummaryDto[];
}

export class LessonSummaryDto {
  @ApiProperty({ description: 'Lesson ID' })
  id!: string;

  @ApiProperty({ description: 'Lesson title' })
  title!: string;

  @ApiProperty({ description: 'Lesson description' })
  description!: string;

  @ApiProperty({ description: 'Day number in course' })
  dayNumber!: number;

  @ApiProperty({ description: 'Lesson duration in minutes' })
  duration!: number;

  @ApiPropertyOptional({ description: 'Practice song title' })
  practiceSongTitle?: string;

  @ApiProperty({ description: 'Whether lesson is published' })
  isPublished!: boolean;

  @ApiProperty({ description: 'Whether lesson is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Lesson sort order' })
  sortOrder!: number;
}

// Backward compatibility
export { CourseResponseDto as VocalCourseResponseDto };
export { LessonSummaryDto as VocalLessonSummaryDto };
