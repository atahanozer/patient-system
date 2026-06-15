import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    // Global rate limit: 100 req / 60s per client. /auth/login is tightened
    // further via @Throttle on the handler.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    PatientsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guard enforces the throttle on every route.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global request logging (one line per request). ChaosInterceptor is NOT
    // global — it stays controller-scoped on patients (see PatientsModule).
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
