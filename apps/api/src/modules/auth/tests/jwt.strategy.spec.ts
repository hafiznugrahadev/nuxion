import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { mockDb } from '../../../../test/helpers/mock-db';
import { JwtStrategy, type JwtPayload } from '../jwt.strategy';

const payload: JwtPayload = {
  sub: 'fixture',
  email: 'fixture@example.test',
  roles: ['SUPER_ADMIN'],
  version: 2,
  family: 'fixture-family',
  purpose: 'full',
  assurance: 'mfa',
};
const user = { id: payload.sub, email: payload.email, securityVersion: payload.version };

function setup(mfa = false) {
  const database = mockDb();
  const config = {
    getOrThrow: () => 'dummy-secret-at-least-thirty-two-characters',
    get: () => mfa,
  } as unknown as ConfigService;
  return { ...database, strategy: new JwtStrategy(config, database.db) };
}

describe('JwtStrategy session authority', () => {
  it('fails closed for legacy tokens without a version and family', async () => {
    const { strategy } = setup();
    await expect(strategy.validate({ sub: payload.sub } as JwtPayload)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejects deleted accounts and changed security versions', async () => {
    const context = setup();
    context.setSelectRows([]);
    await expect(context.strategy.validate(payload)).rejects.toMatchObject({ status: 401 });
    context.setSelectRows([{ ...user, securityVersion: 3 }]);
    await expect(context.strategy.validate(payload)).rejects.toMatchObject({ status: 401 });
  });

  it('rejects sessions whose refresh family has been revoked', async () => {
    const context = setup();
    context.setSelectRows([user]);
    context.thenSelectRows([]);
    await expect(context.strategy.validate(payload)).rejects.toMatchObject({ status: 401 });
  });

  it('uses current roles rather than privileged stale claims', async () => {
    const context = setup();
    context.setSelectRows([user]);
    context.thenSelectRows([{ id: 'active-refresh' }]);
    context.thenSelectRows([{ name: 'USER' }]);
    const result = await context.strategy.validate(payload);
    expect(result.roles).toEqual(['USER']);
    expect(result.enrollmentRequired).toBe(false);
  });

  it('rejects password-only full sessions after mandatory MFA is enabled', async () => {
    const context = setup(true);
    context.setSelectRows([user]);
    context.thenSelectRows([{ id: 'active-refresh' }]);
    await expect(
      context.strategy.validate({ ...payload, assurance: 'password' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('preserves enrollment restrictions and accepts user-verified passkey sessions', async () => {
    for (const session of [
      { ...payload, purpose: 'enrollment' as const, assurance: 'password' as const },
      { ...payload, assurance: 'passkey' as const },
    ]) {
      const context = setup(true);
      context.setSelectRows([user]);
      context.thenSelectRows([{ id: 'active-refresh' }]);
      context.thenSelectRows([{ name: 'ADMIN' }]);
      const result = await context.strategy.validate(session);
      expect(result.enrollmentRequired).toBe(session.purpose === 'enrollment');
    }
  });
});
