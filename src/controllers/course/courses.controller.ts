import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from '../../services/courses.service';
import { CreateCourseDto } from '../../dto/course/create-course.dto';
import { UpdateCourseDto } from '../../dto/course/update-course.dto';
import { CourseResponseDto } from '../../dto/course/course-response.dto';
import { CreateLessonDto } from '../../dto/course/create-lesson.dto';
import { UpdateLessonDto } from '../../dto/course/update-lesson.dto';
import { LessonResponseDto } from '../../dto/course/lesson-response.dto';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentResponseDto,
  LessonProgressDto,
  LessonProgressResponseDto,
} from '../../dto/course/enrollment.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // Course Management (All authenticated users)
  @Post()
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Course created successfully', type: CourseResponseDto })
  async createCourse(@Body() createCourseDto: CreateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.createCourse(createCourseDto);
  }

  @Get('debug/database')
  @ApiOperation({ summary: 'Debug: Get all courses directly from database' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Direct database query results' })
  async debugDatabase() {
    // Direct database inspection for debugging
    const allCourses = await this.coursesService.debugGetAllCourses();
    return {
      message: 'Direct database query results',
      courses: allCourses,
      count: allCourses.length
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'level', required: false, type: String, description: 'Course level filter' })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean, description: 'Published courses only' })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean, description: 'Featured courses only' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Courses retrieved successfully' })
  async findAllCourses(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('level') level?: string,
    @Query('isPublished') isPublished?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('search') search?: string,
  ) {
    // Convert string parameters to boolean or undefined
    const isPublishedBool = isPublished === 'true' ? true : isPublished === 'false' ? false : undefined;
    const isFeaturedBool = isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined;

    return this.coursesService.findAllCourses(page, limit, level, isPublishedBool, isFeaturedBool, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiQuery({ name: 'includeLessons', required: false, type: Boolean, description: 'Include lessons in response' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course retrieved successfully', type: CourseResponseDto })
  async findCourseById(
    @Param('id') id: string,
    @Query('includeLessons') includeLessons?: boolean,
  ): Promise<CourseResponseDto> {
    return this.coursesService.findCourseById(id, includeLessons);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course updated successfully', type: CourseResponseDto })
  async updateCourse(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    return this.coursesService.updateCourse(id, updateCourseDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Course deleted successfully' })
  async deleteCourse(@Param('id') id: string): Promise<void> {
    return this.coursesService.deleteCourse(id);
  }

  // Lesson Management (All authenticated users)
  @Post('lessons')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new lesson' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Lesson created successfully', type: LessonResponseDto })
  async createLesson(@Body() createLessonDto: CreateLessonDto): Promise<LessonResponseDto> {
    return this.coursesService.createLesson(createLessonDto);
  }

  @Get(':courseId/lessons')
  @ApiOperation({ summary: 'Get all lessons for a course' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lessons retrieved successfully', type: [LessonResponseDto] })
  async findLessonsByCourse(@Param('courseId') courseId: string): Promise<LessonResponseDto[]> {
    return this.coursesService.findLessonsByCourse(courseId);
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Get a lesson by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lesson retrieved successfully', type: LessonResponseDto })
  async findLessonById(@Param('id') id: string): Promise<LessonResponseDto> {
    return this.coursesService.findLessonById(id);
  }

  @Patch('lessons/:id')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lesson updated successfully', type: LessonResponseDto })
  async updateLesson(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ): Promise<LessonResponseDto> {
    return this.coursesService.updateLesson(id, updateLessonDto);
  }

  @Delete('lessons/:id')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a lesson' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Lesson deleted successfully' })
  async deleteLesson(@Param('id') id: string): Promise<void> {
    return this.coursesService.deleteLesson(id);
  }

  // Admin Enrollment Management
  @Get('enrollments')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all enrollments (admin)' })
  @ApiQuery({ name: 'courseId', required: false, type: String, description: 'Filter by course ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Enrollments retrieved successfully', type: [EnrollmentResponseDto] })
  async getAllEnrollments(@Query('courseId') courseId?: string): Promise<EnrollmentResponseDto[]> {
    return this.coursesService.findAllEnrollments(courseId);
  }

  // Customer Enrollment (Customer endpoints)
  @Post('enroll')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Enrolled successfully', type: EnrollmentResponseDto })
  async enrollInCourse(
    @Request() req: any,
    @Body() createEnrollmentDto: CreateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    return this.coursesService.enrollCustomer(req.user.sub, createEnrollmentDto);
  }

  @Get('my-enrollments')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer enrollments' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Enrollments retrieved successfully', type: [EnrollmentResponseDto] })
  async getMyEnrollments(@Request() req: any): Promise<EnrollmentResponseDto[]> {
    return this.coursesService.findCustomerEnrollments(req.user.sub);
  }

  @Get('enrollments/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Enrollment retrieved successfully', type: EnrollmentResponseDto })
  async getEnrollment(@Param('id') id: string): Promise<EnrollmentResponseDto> {
    return this.coursesService.findEnrollmentById(id);
  }

  @Patch('enrollments/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update enrollment progress' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Enrollment updated successfully', type: EnrollmentResponseDto })
  async updateEnrollment(
    @Param('id') id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    return this.coursesService.updateEnrollment(id, updateEnrollmentDto);
  }

  // Lesson Progress (Customer endpoints)
  @Post('lesson-progress')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lesson progress' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Progress updated successfully', type: LessonProgressResponseDto })
  async updateLessonProgress(
    @Request() req: any,
    @Body() lessonProgressDto: LessonProgressDto,
  ): Promise<LessonProgressResponseDto> {
    return this.coursesService.updateLessonProgress(req.user.sub, lessonProgressDto);
  }

  @Get(':courseId/my-progress')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lesson progress for a course' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Progress retrieved successfully', type: [LessonProgressResponseDto] })
  async getMyLessonProgress(
    @Request() req: any,
    @Param('courseId') courseId: string,
  ): Promise<LessonProgressResponseDto[]> {
    return this.coursesService.findLessonProgress(req.user.sub, courseId);
  }
}
