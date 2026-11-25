import { INestApplication } from '@nestjs/common';
import { createValidationPipe } from '../../src/common/validation/create-validation-pipe';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { useContainer } from 'class-validator';
import { getDrizzleToken } from '@nestjs/drizzle';
import { AppModule } from '../../src/app.module';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import type { Database } from '../../src/db/relations';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });

  // Mirror main.ts security wiring so e2e specs exercise (and assert) it.
  // Supertest sends no Sec-Fetch-Site/Origin, so plain requests pass the CSRF
  // check like any non-browser client; specs forge headers to test rejections.
  app.useSecurityHeaders({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  app.enableCsrfProtection({
    trustedOrigins: app.get(ConfigService).get<string[]>('app.csrf.trustedOrigins') ?? [],
  });

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.init();
  return app;
}

export async function getDb(app: INestApplication): Promise<Database> {
  return app.get<Database>(getDrizzleToken());
}

/** Return the request Cookie value from Better Auth's Set-Cookie response. */
export function extractSessionCookie(headers: Record<string, string | string[]>): string {
  const raw = headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return cookies
    .filter((cookie) => /^(?:__Secure-)?better-auth\.session_token=/.test(cookie))
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

/** Unique e2e-only email so tests never clash with seeded users. */
export const E2E_PREFIX = 'e2e-test-';

export const SEED_USERS = {
  superAdmin: { email: 'superadmin@nuxion.test', password: 'super1234' },
  admin: { email: 'admin@nuxion.test', password: 'admin123' },
  user: { email: 'user@nuxion.test', password: 'user1234' },
} as const;
