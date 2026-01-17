import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@unite-discord/db-models';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    console.log('📊 Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('📊 Prisma disconnected from database');
  }
}
