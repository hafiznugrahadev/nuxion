import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** Thin cache facade over ioredis — JSON get/set with TTL. */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  get raw(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    return (await this.client.set(key, '1', 'EX', ttlSeconds, 'NX')) === 'OK';
  }

  async consume<T>(key: string): Promise<T | null> {
    const raw = await this.client.getdel(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async reserveChallenge<T>(key: string, maximum: number): Promise<T | null> {
    const raw = (await this.client.eval(
      `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return nil end
      local challenge = cjson.decode(raw)
      if challenge.attempts >= tonumber(ARGV[1]) then return nil end
      challenge.attempts = challenge.attempts + 1
      redis.call('SET', KEYS[1], cjson.encode(challenge), 'KEEPTTL')
      return cjson.encode(challenge)
    `,
      1,
      key,
      maximum,
    )) as string | null;
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async consumeMatching<T>(key: string, expected: T): Promise<boolean> {
    return (
      (await this.client.eval(
        `
      local raw = redis.call('GET', KEYS[1])
      if raw ~= ARGV[1] then return 0 end
      redis.call('DEL', KEYS[1])
      return 1
    `,
        1,
        key,
        JSON.stringify(expected),
      )) === 1
    );
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }
}
