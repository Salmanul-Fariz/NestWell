import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.use(cookieParser());

  const extraOrigins = (process.env.FRONTEND_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...extraOrigins,
    ],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Same Render process: API + the built Vite app. Dev still uses the Vite proxy.
  const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');
  if (existsSync(frontendDist)) {
    app.useStaticAssets(frontendDist);
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api') || req.path === '/health') return next();
      res.sendFile(join(frontendDist, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  // Bind IPv4 inside Docker so Nginx can reach this process (avoids IPv6-only listen).
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start NestWell backend', err);
  process.exit(1);
});
