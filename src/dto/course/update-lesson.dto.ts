import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto';

export class UpdateLessonDto extends PartialType(
  OmitType(CreateLessonDto, ['courseId'] as const)
) {}

// Backward compatibility
export { UpdateLessonDto as UpdateVocalLessonDto };
