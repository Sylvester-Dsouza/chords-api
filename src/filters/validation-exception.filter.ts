import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    console.log('Validation error:', JSON.stringify(exceptionResponse, null, 2));

    // Check if this is a validation error
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      const validationErrors = exceptionResponse.message;
      
      // Format the validation errors for better readability
      const formattedErrors = validationErrors.reduce((acc: Record<string, string[]>, error: string) => {
        const match = error.match(/^([^:]+): (.+)$/);
        if (match) {
          const field = match[1];
          const message = match[2];
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(message);
        } else {
          if (!acc.general) {
            acc.general = [];
          }
          acc.general.push(error);
        }
        return acc;
      }, {});

      return response.status(status).json({
        statusCode: status,
        error: 'Bad Request',
        validationErrors: formattedErrors
      });
    }

    // If it's not a validation error, return the original response
    return response.status(status).json(exceptionResponse);
  }
}
