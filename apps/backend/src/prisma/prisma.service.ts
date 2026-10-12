import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to MySQL database successfully.');
    } catch (err: any) {
      this.logger.warn(
        `Could not connect to MySQL database at startup (${err.message}). ` +
        `Please ensure MySQL is running (e.g. via 'docker compose up -d').`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
