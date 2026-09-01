import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import * as cookieParserNamespace from 'cookie-parser';
import cookieParserDefault from 'cookie-parser';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

const cookieParser = (cookieParserDefault || cookieParserNamespace) as unknown as typeof cookieParserDefault;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.use((typeof cookieParser === 'function' ? cookieParser : (cookieParser as any).default)());

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
