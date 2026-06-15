import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // whitelist + forbidNonWhitelisted strip/reject unknown fields; transform powers
  // @Type() coercion (e.g. query page/limit → numbers). Without this, every DTO's
  // validation — including LoginDto — is inert.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  app.use(helmet());

  const config = app.get(ConfigService);
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN'), credentials: false });

  // Single registration of the catch-all error filter (not also via APP_FILTER).
  app.useGlobalFilters(new HttpExceptionFilter());

  // PORT comes from validated config (default 3001), not raw process.env.
  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
}

void bootstrap();
