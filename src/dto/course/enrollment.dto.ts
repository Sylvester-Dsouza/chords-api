import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'Course ID to enroll in' })
  @IsString()
  courseId!: string;
}

export class UpdateEnrollmentDto {
  @ApiPropertyOptional({
    description: 'Enrollment status',
    enum: EnrollmentStatus
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({ description: 'Current day in course', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  currentDay?: number;

  @ApiPropertyOptional({ description: 'Progress percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ description: 'Course rating (1-5 stars)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Course review' })
  @IsOptional()
  @IsString()
  review?: string;
}

export class EnrollmentResponseDto {
  @ApiProperty({ description: 'Enrollment ID' })
  id!: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @ApiProperty({ description: 'Course ID' })
  courseId!: string;

  @ApiProperty({
    description: 'Enrollment status',
    enum: EnrollmentStatus
  })
  status!: EnrollmentStatus;

  @ApiProperty({ description: 'Current day in course' })
  currentDay!: number;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress!: number;

  @ApiProperty({ description: 'Enrollment date' })
  enrolledAt!: Date;

  @ApiPropertyOptional({ description: 'Course start date' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Course completion date' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Last access date' })
  lastAccessedAt?: Date;

  @ApiPropertyOptional({ description: 'Course rating (1-5 stars)' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Course review' })
  review?: string;

  @ApiProperty({ description: 'Enrollment creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Enrollment last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Course information (if included)' })
  course?: {
    id: string;
    title: string;
    subtitle?: string;
    level: string;
    emoji?: string;
    color?: string;
    totalDays: number;
    totalLessons: number;
    estimatedHours: number;
  };
}

export class LessonProgressDto {
  @ApiProperty({ description: 'Lesson ID' })
  @IsString()
  lessonId!: string;

  @ApiPropertyOptional({
    description: 'Lesson progress status',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'IN_PROGRESS'
  })
  @IsOptional()
  @IsEnum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Time spent on lesson in minutes', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Lesson rating (1-5 stars)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Personal notes about the lesson' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class LessonProgressResponseDto {
  @ApiProperty({ description: 'Progress ID' })
  id!: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @ApiProperty({ description: 'Lesson ID' })
  lessonId!: string;

  @ApiProperty({ description: 'Progress status' })
  status!: string;

  @ApiPropertyOptional({ description: 'Completion date' })
  completedAt?: Date;

  @ApiProperty({ description: 'Time spent in minutes' })
  timeSpent!: number;

  @ApiProperty({ description: 'Number of attempts' })
  attempts!: number;

  @ApiPropertyOptional({ description: 'Lesson rating (1-5 stars)' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Personal notes' })
  notes?: string;

  @ApiProperty({ description: 'Progress creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Progress last update date' })
  updatedAt!: Date;
}
