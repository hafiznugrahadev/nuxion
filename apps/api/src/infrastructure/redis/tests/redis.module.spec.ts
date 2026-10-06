import 'reflect-metadata';
import Redis from 'ioredis';
import { afterEach, describe, expect, it } from 'vitest';
import { createRedisClient } from '../redis.module';

// ioredis connects on construct (lazyConnect: false) — disconnect every client
// so no socket/retry timer outlives the test run.
const clients: Redis[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.disconnect();
});

describe('createRedisClient', () => {
  it('parses a REDIS_URL connection string into host/port/password', () => {
    const client = createRedisClient({ url: 'redis://:secret@nuxion-redis:6380/2' });
    clients.push(client);
    expect(client.options).toMatchObject({
      host: 'nuxion-redis',
      port: 6380,
      password: 'secret',
    });
  });

  it('enables TLS for rediss:// URLs', () => {
    const client = createRedisClient({ url: 'rediss://cache.example.com:6379' });
    clients.push(client);
    expect(client.options.tls).toBeTruthy();
  });

  it('prefers the URL over the discrete vars (REDIS_URL wins)', () => {
    const client = createRedisClient({
      url: 'redis://url-host:6380',
      host: 'discrete-host',
      port: 6379,
    });
    clients.push(client);
    expect(client.options).toMatchObject({ host: 'url-host', port: 6380 });
  });

  it('falls back to discrete host/port/password when no URL is set', () => {
    const client = createRedisClient({ host: 'nuxion-redis', port: 6379, password: 'pw' });
    clients.push(client);
    expect(client.options).toMatchObject({ host: 'nuxion-redis', port: 6379, password: 'pw' });
  });

  it('drops an empty password (anonymous local redis)', () => {
    const client = createRedisClient({ host: 'localhost', port: 6379, password: '' });
    clients.push(client);
    // ioredis normalizes an absent password to null.
    expect(client.options.password).toBeNull();
  });
});
