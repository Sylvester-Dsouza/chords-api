import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { initializeFirebase } from './config/firebase.config';
import { configureMiddleware } from './config/middleware.config';
import { ValidationExceptionFilter } from './filters/validation-exception.filter';
import compression from 'compression';

async function bootstrap() {
  // Set Node.js memory optimization flags
  if (process.env.NODE_ENV === 'production') {
    process.env.NODE_OPTIONS = '--max-old-space-size=400 --optimize-for-size';
  }

  // Initialize Firebase Admin SDK only if needed
  let firebaseInitialized = false;
  if (process.env.FIREBASE_PROJECT_ID) {
    firebaseInitialized = initializeFirebase();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Firebase initialization result: ${firebaseInitialized ? 'SUCCESS' : 'FAILED'}`);
    }
  }

  // Configure logger for minimal memory usage in production
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    bufferLogs: false, // Disable log buffering to save memory
    abortOnError: false, // Don't abort on errors to save memory
  });
  
  // Enable compression with memory-efficient settings
  app.use(compression({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses > 1KB
    memLevel: 7, // Reduce memory usage
  }));

  // Enable CORS with minimal configuration for memory efficiency
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://chords-admin.vercel.app']
      : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours - cache preflight requests
  });

  // Enable validation with memory optimization
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: process.env.NODE_ENV === 'production', // Reduce memory in prod
    validationError: { target: false, value: false }, // Reduce memory usage
  }));

  // Register validation exception filter only in development
  if (process.env.NODE_ENV !== 'production') {
    app.useGlobalFilters(new ValidationExceptionFilter());
  }

  // Set global prefix but exclude legacy routes
  app.setGlobalPrefix('api', {
    exclude: [
      // Add routes that should be accessible without the 'api' prefix
      { path: 'songs*', method: RequestMethod.ALL },
      { path: 'artists*', method: RequestMethod.ALL },
      { path: 'collections*', method: RequestMethod.ALL },
      { path: 'tags*', method: RequestMethod.ALL },
      { path: 'comments*', method: RequestMethod.ALL },
      { path: 'auth*', method: RequestMethod.ALL },
      { path: 'admin*', method: RequestMethod.ALL },
      { path: 'customers*', method: RequestMethod.ALL },
      { path: 'users*', method: RequestMethod.ALL },
      { path: 'chord-diagrams*', method: RequestMethod.ALL },
      { path: 'upload*', method: RequestMethod.ALL },
      { path: 'setlists*', method: RequestMethod.ALL },
      { path: 'liked-songs*', method: RequestMethod.ALL },
      { path: 'subscriptions*', method: RequestMethod.ALL },
      { path: 'song-requests*', method: RequestMethod.ALL },
      // { path: 'notifications*', method: RequestMethod.ALL }, // Removed - notifications should use /api prefix
      { path: 'song-ratings*', method: RequestMethod.ALL },
      { path: 'courses*', method: RequestMethod.ALL },
      { path: 'health*', method: RequestMethod.ALL }, // Exclude health endpoints from /api prefix
      // Also exclude root route
      { path: '', method: RequestMethod.GET }
    ],
  });

  // Setup Swagger documentation only in development to save memory
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Chords App API')
      .setDescription('API for Christian song chords application')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Configure middleware
  configureMiddleware(app);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  // Minimal logging in production to save memory
  if (process.env.NODE_ENV === 'production') {
    console.log(`Server running on port ${port}`);
  } else {
    console.info(`Application is running on: ${await app.getUrl()}`);
    console.info(`Swagger documentation available at: ${await app.getUrl()}/api/docs`);
  }

  // Force garbage collection after startup
  if (global.gc) {
    global.gc();
  }
}
bootstrap();
