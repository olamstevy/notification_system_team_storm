/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect().catch((error) => {
      console.error('Failed to connect to database:', error);
      throw error;
    });
  }

  async onModuleDestroy() {
    await this.$disconnect().catch((error) => {
      console.error('Failed to disconnect from database:', error);
    });
  }
}
