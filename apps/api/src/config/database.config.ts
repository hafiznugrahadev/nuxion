import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const redisConfig = registerAs('redis', () => ({
  // Single connection string (REDIS_URL, the Dokploy/managed-Redis shape) wins
  // when set; the discrete host/port/password vars remain the fallback for
  // environments that wire them individually (docker-compose dev).
  url: process.env.REDIS_URL?.trim() || undefined,
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
}));
