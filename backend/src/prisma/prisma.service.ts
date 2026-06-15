import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  // Cleanly close the connection pool on app shutdown. Paired with
  // app.enableShutdownHooks() in main.ts so SIGTERM/SIGINT trigger onModuleDestroy.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
