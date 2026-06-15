import { Module } from '@nestjs/common';
import { ChaosInterceptor } from '../common/interceptors/chaos.interceptor';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  controllers: [PatientsController],
  // ChaosInterceptor is provided here (not via APP_INTERCEPTOR) so Nest can resolve
  // its ConfigService dependency while keeping it scoped to the patients controller.
  providers: [PatientsService, ChaosInterceptor],
})
export class PatientsModule {}
