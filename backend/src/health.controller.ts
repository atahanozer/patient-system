import { Controller, Get } from '@nestjs/common';

/** Public liveness probe — intentionally NOT behind auth (used by Docker/LB). */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
