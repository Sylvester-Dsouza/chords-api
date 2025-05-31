import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateCourseDto } from '../dto/course/create-course.dto';
import { UpdateCourseDto } from '../dto/course/update-course.dto';
import { CourseResponseDto } from '../dto/course/course-response.dto';
import { CreateLessonDto } from '../dto/course/create-lesson.dto';
import { UpdateLessonDto } from '../dto/course/update-lesson.dto';
import { LessonResponseDto } from '../dto/course/lesson-response.dto';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentResponseDto,
  LessonProgressDto,
  LessonProgressResponseDto
} from '../dto/course/enrollment.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  // Debug method to get all courses directly from database
  async debugGetAllCourses(): Promise<any[]> {
    console.log('🔍 DEBUG: Getting all courses directly from database...');

    const allCourses = await this.prisma.course.findMany({
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        level: true,
        courseType: true,
        isActive: true,
        isPublished: true,
        isFeatured: true,
        totalDays: true,
        totalLessons: true,
        estimatedHours: true,
        price: true,
        viewCount: true,
        enrollmentCount: true,
        completionRate: true,
        averageRating: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('🔍 DEBUG: Found courses:', allCourses.length);
    console.log('🔍 DEBUG: First course:', allCourses[0] ? JSON.stringify(allCourses[0], null, 2) : 'No courses');

    return allCourses;
  }

  // Course Management
  async createCourse(createCourseDto: CreateCourseDto): Promise<CourseResponseDto> {
    console.log('🔍 API: Creating course with data:', JSON.stringify(createCourseDto, null, 2));

    // Ensure course is active by default
    const courseData = {
      ...createCourseDto,
      isActive: createCourseDto.isActive !== undefined ? createCourseDto.isActive : true,
      isPublished: createCourseDto.isPublished !== undefined ? createCourseDto.isPublished : false,
      isFeatured: createCourseDto.isFeatured !== undefined ? createCourseDto.isFeatured : false,
      totalDays: createCourseDto.totalDays || 1,
      totalLessons: createCourseDto.totalLessons || 0,
      estimatedHours: createCourseDto.estimatedHours || 1,
      viewCount: 0,
      enrollmentCount: 0,
      completionRate: 0,
      averageRating: 0,
      ratingCount: 0,
    };

    console.log('🔍 API: Final course data for creation:', JSON.stringify(courseData, null, 2));

    const course = await this.prisma.course.create({
      data: courseData,
      include: {
        lessons: {
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    console.log('✅ API: Course created successfully:', JSON.stringify(course, null, 2));
    return this.mapCourseToResponse(course);
  }

  async findAllCourses(
    page: number = 1,
    limit: number = 10,
    level?: string,
    isPublished?: boolean,
    isFeatured?: boolean,
    search?: string,
  ): Promise<{ courses: CourseResponseDto[]; total: number; page: number; limit: number }> {
    console.log('🔍 API: findAllCourses called with params:', { page, limit, level, isPublished, isFeatured, search });

    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (level) {
      where.level = level;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    console.log('🔍 API: Database query where clause:', JSON.stringify(where, null, 2));
    console.log('🔍 API: Database query pagination:', { skip, take: limit });

    // First, let's check if there are ANY courses in the database
    const allCoursesCount = await this.prisma.course.count();
    const activeCoursesCount = await this.prisma.course.count({ where: { isActive: true } });
    const inactiveCoursesCount = await this.prisma.course.count({ where: { isActive: false } });

    console.log('📊 API: Database course counts:', {
      total: allCoursesCount,
      active: activeCoursesCount,
      inactive: inactiveCoursesCount
    });

    // Let's get a sample of ALL courses to see what's in the database
    const allCourses = await this.prisma.course.findMany({
      take: 5, // Just get first 5 courses
      select: {
        id: true,
        title: true,
        isActive: true,
        isPublished: true,
        level: true,
        courseType: true,
        createdAt: true
      }
    });

    console.log('📋 API: Sample courses in database:', JSON.stringify(allCourses, null, 2));

    // Let's also check what the current where clause would match
    const whereClauseMatches = await this.prisma.course.findMany({
      where,
      take: 5,
      select: {
        id: true,
        title: true,
        isActive: true,
        isPublished: true,
        level: true,
        courseType: true,
        createdAt: true
      }
    });

    console.log('📋 API: Courses matching where clause:', JSON.stringify(whereClauseMatches, null, 2));

    // Temporary fix: Update any courses with isActive = false to true
    if (inactiveCoursesCount > 0) {
      console.log('🔧 API: Fixing inactive courses...');
      const fixResult = await this.prisma.course.updateMany({
        where: {
          isActive: false
        },
        data: {
          isActive: true
        }
      });
      console.log('✅ API: Fixed courses count:', fixResult.count);
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          lessons: {
            where: { isActive: true },
            orderBy: { dayNumber: 'asc' },
          },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    console.log('📦 API: Raw courses from database:', courses.length);
    console.log('📦 API: Total count from database:', total);
    console.log('📦 API: First course (if any):', courses[0] ? JSON.stringify(courses[0], null, 2) : 'No courses found');

    const mappedCourses = courses.map(course => this.mapCourseToResponse(course));
    console.log('📦 API: Mapped courses:', mappedCourses.length);
    console.log('📦 API: First mapped course (if any):', mappedCourses[0] ? JSON.stringify(mappedCourses[0], null, 2) : 'No mapped courses');

    const result = {
      courses: mappedCourses,
      total,
      page,
      limit,
    };

    console.log('✅ API: Final response:', JSON.stringify(result, null, 2));
    return result;
  }

  async findCourseById(id: string, includeLessons: boolean = true): Promise<CourseResponseDto> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        lessons: includeLessons ? {
          where: { isActive: true },
          orderBy: { dayNumber: 'asc' },
          include: {
            practiceSong: {
              include: {
                artist: true,
              },
            },
          },
        } : false,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Increment view count
    await this.prisma.course.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return this.mapCourseToResponse(course);
  }



  async updateCourse(id: string, updateCourseDto: UpdateCourseDto): Promise<CourseResponseDto> {
    // Check if course exists
    const existingCourse = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      throw new NotFoundException('Course not found');
    }



    const course = await this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
      include: {
        lessons: {
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    return this.mapCourseToResponse(course);
  }

  async deleteCourse(id: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.course.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Lesson Management
  async createLesson(createLessonDto: CreateLessonDto): Promise<LessonResponseDto> {
    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createLessonDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if day number already exists in this course
    const existingLesson = await this.prisma.lesson.findFirst({
      where: {
        courseId: createLessonDto.courseId,
        dayNumber: createLessonDto.dayNumber,
        isActive: true,
      },
    });

    if (existingLesson) {
      throw new ConflictException(`Day ${createLessonDto.dayNumber} already exists in this course`);
    }

    // Validate practice song exists if provided
    if (createLessonDto.practiceSongId) {
      const song = await this.prisma.song.findUnique({
        where: { id: createLessonDto.practiceSongId },
      });

      if (!song) {
        throw new NotFoundException('Practice song not found');
      }
    }

    const lesson = await this.prisma.lesson.create({
      data: createLessonDto,
      include: {
        course: true,
        practiceSong: {
          include: {
            artist: true,
          },
        },
      },
    });

    // Update course lesson count
    await this.updateCourseLessonCount(createLessonDto.courseId);

    return this.mapLessonToResponse(lesson);
  }

  async findLessonsByCourse(courseId: string): Promise<LessonResponseDto[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        courseId,
        isActive: true,
      },
      include: {
        course: true,
        practiceSong: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: { dayNumber: 'asc' },
    });

    return lessons.map(lesson => this.mapLessonToResponse(lesson));
  }

  async findLessonById(id: string): Promise<LessonResponseDto> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        course: true,
        practiceSong: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return this.mapLessonToResponse(lesson);
  }

  async updateLesson(id: string, updateLessonDto: UpdateLessonDto): Promise<LessonResponseDto> {
    const existingLesson = await this.prisma.lesson.findUnique({
      where: { id },
    });

    if (!existingLesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check day number uniqueness if updating
    if (updateLessonDto.dayNumber && updateLessonDto.dayNumber !== existingLesson.dayNumber) {
      const conflictingLesson = await this.prisma.lesson.findFirst({
        where: {
          courseId: existingLesson.courseId,
          dayNumber: updateLessonDto.dayNumber,
          isActive: true,
          id: { not: id },
        },
      });

      if (conflictingLesson) {
        throw new ConflictException(`Day ${updateLessonDto.dayNumber} already exists in this course`);
      }
    }

    // Validate practice song if provided
    if (updateLessonDto.practiceSongId) {
      const song = await this.prisma.song.findUnique({
        where: { id: updateLessonDto.practiceSongId },
      });

      if (!song) {
        throw new NotFoundException('Practice song not found');
      }
    }

    const lesson = await this.prisma.lesson.update({
      where: { id },
      data: updateLessonDto,
      include: {
        course: true,
        practiceSong: {
          include: {
            artist: true,
          },
        },
      },
    });

    return this.mapLessonToResponse(lesson);
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.lesson.update({
      where: { id },
      data: { isActive: false },
    });

    // Update course lesson count
    await this.updateCourseLessonCount(lesson.courseId);
  }

  // Enrollment Management
  async enrollCustomer(customerId: string, createEnrollmentDto: CreateEnrollmentDto): Promise<EnrollmentResponseDto> {
    // Check if course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: createEnrollmentDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.isPublished) {
      throw new BadRequestException('Course is not published');
    }

    // Check if customer is already enrolled
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        customerId_courseId: {
          customerId,
          courseId: createEnrollmentDto.courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Customer is already enrolled in this course');
    }

    const enrollment = await this.prisma.courseEnrollment.create({
      data: {
        customerId,
        courseId: createEnrollmentDto.courseId,
      },
      include: {
        course: true,
      },
    });

    // Update course enrollment count
    await this.prisma.course.update({
      where: { id: createEnrollmentDto.courseId },
      data: { enrollmentCount: { increment: 1 } },
    });

    return this.mapEnrollmentToResponse(enrollment);
  }

  async findAllEnrollments(courseId?: string): Promise<EnrollmentResponseDto[]> {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: courseId ? { courseId } : {},
      include: {
        course: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map(enrollment => this.mapEnrollmentToResponse(enrollment));
  }

  async findCustomerEnrollments(customerId: string): Promise<EnrollmentResponseDto[]> {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { customerId },
      include: {
        course: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map(enrollment => this.mapEnrollmentToResponse(enrollment));
  }

  async findEnrollmentById(id: string): Promise<EnrollmentResponseDto> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return this.mapEnrollmentToResponse(enrollment);
  }

  async updateEnrollment(id: string, updateEnrollmentDto: UpdateEnrollmentDto): Promise<EnrollmentResponseDto> {
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id },
    });

    if (!existingEnrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const updateData: any = { ...updateEnrollmentDto };

    // Set completion date if status is COMPLETED
    if (updateEnrollmentDto.status === 'COMPLETED' && existingEnrollment.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    // Set started date if not already set
    if (!existingEnrollment.startedAt && updateEnrollmentDto.currentDay && updateEnrollmentDto.currentDay > 1) {
      updateData.startedAt = new Date();
    }

    // Update last accessed date
    updateData.lastAccessedAt = new Date();

    const enrollment = await this.prisma.courseEnrollment.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
      },
    });

    return this.mapEnrollmentToResponse(enrollment);
  }

  // Lesson Progress Management
  async updateLessonProgress(
    customerId: string,
    lessonProgressDto: LessonProgressDto,
  ): Promise<LessonProgressResponseDto> {
    // Check if lesson exists
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonProgressDto.lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check if customer is enrolled in the course
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        customerId_courseId: {
          customerId,
          courseId: lesson.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new BadRequestException('Customer is not enrolled in this course');
    }

    const updateData: any = {
      ...lessonProgressDto,
      attempts: { increment: 1 },
    };

    // Set completion date if status is COMPLETED
    if (lessonProgressDto.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const progress = await this.prisma.lessonProgress.upsert({
      where: {
        customerId_lessonId: {
          customerId,
          lessonId: lessonProgressDto.lessonId,
        },
      },
      update: updateData,
      create: {
        customerId,
        ...lessonProgressDto,
        attempts: 1,
        completedAt: lessonProgressDto.status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    // Update enrollment progress
    await this.updateEnrollmentProgress(customerId, lesson.courseId);

    return progress as LessonProgressResponseDto;
  }

  async findLessonProgress(customerId: string, courseId: string): Promise<LessonProgressResponseDto[]> {
    const progress = await this.prisma.lessonProgress.findMany({
      where: {
        customerId,
        lesson: {
          courseId,
        },
      },
      include: {
        lesson: true,
      },
      orderBy: {
        lesson: {
          dayNumber: 'asc',
        },
      },
    });

    return progress.map(p => ({
      id: p.id,
      customerId: p.customerId,
      lessonId: p.lessonId,
      status: p.status,
      completedAt: p.completedAt || undefined,
      timeSpent: p.timeSpent,
      attempts: p.attempts,
      rating: p.rating || undefined,
      notes: p.notes || undefined,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  // Helper Methods

  private async updateCourseLessonCount(courseId: string): Promise<void> {
    const lessonCount = await this.prisma.lesson.count({
      where: {
        courseId,
        isActive: true,
      },
    });

    await this.prisma.course.update({
      where: { id: courseId },
      data: { totalLessons: lessonCount },
    });
  }

  private async updateEnrollmentProgress(customerId: string, courseId: string): Promise<void> {
    const [totalLessons, completedLessons] = await Promise.all([
      this.prisma.lesson.count({
        where: {
          courseId,
          isActive: true,
        },
      }),
      this.prisma.lessonProgress.count({
        where: {
          customerId,
          status: 'COMPLETED',
          lesson: {
            courseId,
          },
        },
      }),
    ]);

    const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    await this.prisma.courseEnrollment.update({
      where: {
        customerId_courseId: {
          customerId,
          courseId,
        },
      },
      data: {
        progress,
        currentDay: completedLessons + 1,
      },
    });
  }

  private mapCourseToResponse(course: any): CourseResponseDto {
    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      level: course.level,
      courseType: course.courseType,
      imageUrl: course.imageUrl,
      totalDays: course.totalDays,
      totalLessons: course.totalLessons,
      estimatedHours: course.estimatedHours,
      isPublished: course.isPublished,
      isFeatured: course.isFeatured,
      isActive: course.isActive,
      price: course.price,
      viewCount: course.viewCount,
      enrollmentCount: course.enrollmentCount,
      completionRate: course.completionRate,
      averageRating: course.averageRating,
      ratingCount: course.ratingCount,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      lessons: course.lessons?.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        dayNumber: lesson.dayNumber,
        duration: lesson.duration,
        practiceSongId: lesson.practiceSongId,
        practiceSongTitle: lesson.practiceSongTitle || lesson.practiceSong?.title,
        instructions: lesson.instructions || '',
        videoUrl: lesson.videoUrl,
        audioUrl: lesson.audioUrl,
        isPublished: lesson.isPublished,
        isActive: lesson.isActive,
        sortOrder: lesson.sortOrder,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      })),
    };
  }

  private mapLessonToResponse(lesson: any): LessonResponseDto {
    return {
      id: lesson.id,
      courseId: lesson.courseId,
      title: lesson.title,
      description: lesson.description,
      dayNumber: lesson.dayNumber,
      duration: lesson.duration,
      practiceSongId: lesson.practiceSongId,
      practiceSongTitle: lesson.practiceSongTitle || lesson.practiceSong?.title,
      instructions: lesson.instructions,
      videoUrl: lesson.videoUrl,
      audioUrl: lesson.audioUrl,
      isPublished: lesson.isPublished,
      isActive: lesson.isActive,
      sortOrder: lesson.sortOrder,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
      course: lesson.course ? {
        id: lesson.course.id,
        title: lesson.course.title,
        level: lesson.course.level,
      } : undefined,
      practiceSong: lesson.practiceSong ? {
        id: lesson.practiceSong.id,
        title: lesson.practiceSong.title,
        artist: lesson.practiceSong.artist?.name || 'Unknown Artist',
        key: lesson.practiceSong.key,
        tempo: lesson.practiceSong.tempo,
      } : undefined,
    };
  }

  private mapEnrollmentToResponse(enrollment: any): EnrollmentResponseDto {
    return {
      id: enrollment.id,
      customerId: enrollment.customerId,
      courseId: enrollment.courseId,
      status: enrollment.status,
      currentDay: enrollment.currentDay,
      progress: enrollment.progress,
      enrolledAt: enrollment.enrolledAt,
      startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt,
      lastAccessedAt: enrollment.lastAccessedAt,
      rating: enrollment.rating,
      review: enrollment.review,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
      course: enrollment.course ? {
        id: enrollment.course.id,
        title: enrollment.course.title,
        subtitle: enrollment.course.subtitle,
        level: enrollment.course.level,
        totalDays: enrollment.course.totalDays,
        totalLessons: enrollment.course.totalLessons,
        estimatedHours: enrollment.course.estimatedHours,
      } : undefined,
    };
  }
}
