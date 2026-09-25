import { Controller, Get } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import type { Database } from '@db/relations';
import { Public } from '@common/decorators/public.decorator';
import { RedisService } from '@infrastructure/redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDrizzle()
    private readonly db: Database,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + DB & Redis readiness probe' })
  async check() {
    const [db, cache] = await Promise.all([
      this.ping(() => this.db.execute(sql`select 1`)),
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
