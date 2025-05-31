import { PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

// Backward compatibility
export { UpdateCourseDto as UpdateVocalCourseDto };
