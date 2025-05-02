import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { initializeFirebase } from './config/firebase.config';
import { configureMiddleware } from './config/middleware.config';

async function bootstrap() {
  // Initialize Firebase Admin SDK
  initializeFirebase();

  // Configure logger to show only errors and warnings in production
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : process.env.MINIMAL_LOGS === 'true'
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable CORS with specific configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://chords-admin.vercel.app',
      'https://admin.yourapp.com',  // Add your production admin URL here
      'https://app.yourapp.com'     // Add your production app URL here
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });

  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Set global prefix but exclude legacy routes
  app.setGlobalPrefix('api', {
    exclude: [
      // Add routes that should be accessible without the 'api' prefix
      '/songs*',
      '/artists*',
      '/collections*',
      '/tags*',
      '/comments*',
      '/auth*',
      '/admin*',
      '/customers*',
      '/users*',
      '/chord-diagrams*',
      '/upload*',
      '/playlists*',
      '/liked-songs*',
      '/subscriptions*',
      '/song-requests*',
      '/notifications*'
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

  const port = process.env.PORT ?? 3001;
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
