import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + DB & Redis readiness probe' })
  async check() {
    const [db, cache] = await Promise.all([
      this.ping(() => this.prisma.$queryRaw`SELECT 1`),
      this.ping(() => this.redis.raw.ping()),
    ]);
    const status = db === 'up' && cache === 'up' ? 'ok' : 'degraded';
    return { status, db, redis: cache, uptime: process.uptime() };
  }

  private async ping(fn: () => Promise<unknown>): Promise<'up' | 'down'> {
    try {
      await fn();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
