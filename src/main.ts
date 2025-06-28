import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { initializeFirebase } from './config/firebase.config';
import { configureMiddleware } from './config/middleware.config';
import { ValidationExceptionFilter } from './filters/validation-exception.filter';
import compression from 'compression';

async function bootstrap() {
  // Initialize Firebase Admin SDK
  const firebaseInitialized = initializeFirebase();
  console.log(`Firebase initialization result: ${firebaseInitialized ? 'SUCCESS' : 'FAILED'}`);

  // If Firebase initialization failed in production, log a warning but continue
  if (!firebaseInitialized && process.env.NODE_ENV === 'production') {
    console.error('WARNING: Firebase initialization failed in production environment. Authentication features may not work correctly.');
  }

  // Configure logger to show only errors and warnings in production
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : process.env.MINIMAL_LOGS === 'true'
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  
  // Enable compression to reduce response size and improve performance
  app.use(compression());

  // Enable CORS with specific configuration
  if (process.env.NODE_ENV === 'production') {
    // In production, use a specific list of allowed origins
    app.enableCors({
      origin: [
        'https://chords-admin.vercel.app',
        'https://admin.yourapp.com',  // Add your production admin URL here
        'https://app.yourapp.com'     // Add your production app URL here
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Authorization'],
      maxAge: 7200 // 2 hours
    });
    console.info('CORS enabled for specific origins (production mode)');
    console.info('Allowed origins:', ['https://chords-admin.vercel.app', 'https://admin.yourapp.com', 'https://app.yourapp.com']);

  } else {
    // In development, allow all origins
    app.enableCors({
      origin: true, // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    });
    console.info('CORS enabled for all origins (development mode)');
  }

  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    // Make validation errors more detailed
    validationError: { target: false, value: true },
  }));

  // Register validation exception filter
  app.useGlobalFilters(new ValidationExceptionFilter());

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

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Chords App API')
    .setDescription('API for Christian song chords application')
    .setVersion('1.0')
    .addTag('users', 'User management endpoints')
    .addTag('customers', 'Customer management endpoints')
    .addTag('songs', 'Song management endpoints')
    .addTag('firebase-auth', 'Firebase authentication endpoints')
    .addTag('upload', 'File upload endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Configure middleware
  configureMiddleware(app);

  const port = process.env.PORT ?? 3001; // Use port 3001 by default
  await app.listen(port);
  // Using console.info is allowed by our ESLint rules
  if (process.env.MINIMAL_LOGS !== 'true') {
    console.info(`Application is running on: ${await app.getUrl()}`);
    console.info(`Swagger documentation available at: ${await app.getUrl()}/api/docs`);
  } else {
    console.info(`Server running on port ${port}`);
  }
}
bootstrap();
