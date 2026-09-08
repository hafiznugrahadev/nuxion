import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** SPEC DRY #10 — global so feature modules never re-import it. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
