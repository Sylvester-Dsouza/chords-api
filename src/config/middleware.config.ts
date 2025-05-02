import { INestApplication } from '@nestjs/common';
import { RateLimitMiddleware } from '../middlewares/rate-limit.middleware';
import { RequestValidationMiddleware } from '../middlewares/request-validation.middleware';

export function configureMiddleware(app: INestApplication): void {
  // Get middlewares from the app
  const rateLimitMiddleware = app.get(RateLimitMiddleware);
  const requestValidationMiddleware = app.get(RequestValidationMiddleware);

  // Apply request validation middleware first
  app.use(requestValidationMiddleware.use.bind(requestValidationMiddleware));

  // Then apply rate limiting middleware
  app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));
}
