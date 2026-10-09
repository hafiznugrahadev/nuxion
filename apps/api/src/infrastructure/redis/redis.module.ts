import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';

export interface RedisConnectionConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
}

/**
 * Build the ioredis client. A full connection string (redis:// or rediss:// —
 * the REDIS_URL shape Dokploy and managed Redis provision) wins when present;
 * ioredis parses it and enables TLS automatically for rediss://. Otherwise the
 * discrete host/port/password vars are used.
 */
export function createRedisClient(config: RedisConnectionConfig): Redis {
  const common = { maxRetriesPerRequest: 3, lazyConnect: false };
  if (config.url) {
    return new Redis(config.url, common);
  }
  return new Redis({
    host: config.host,
    port: config.port,
    password: config.password || undefined,
    ...common,
  });
}

/** SPEC DRY #10 — global Redis client + cache service. */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createRedisClient({
          url: config.get<string>('redis.url'),
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        }),
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
