import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CourseLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Course subtitle' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ description: 'Course description' })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Course difficulty level',
    enum: CourseLevel,
    example: CourseLevel.BEGINNER
  })
  @IsEnum(CourseLevel)
  level!: CourseLevel;

  @ApiProperty({
    description: 'Course type',
    example: '',
    default: ''
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Course type must be less than 50 characters' })
  courseType?: string;

  @ApiPropertyOptional({ description: 'Course cover image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Total days in course', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalDays?: number;

  @ApiPropertyOptional({ description: 'Total lessons in course', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalLessons?: number;

  @ApiPropertyOptional({ description: 'Estimated hours to complete', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Whether course is published', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Whether course is featured', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Whether course is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Course price (null for free courses)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

// Backward compatibility
export { CreateCourseDto as CreateVocalCourseDto };
