import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { useContainer } from 'class-validator';
import { AppModule } from '../../src/app.module';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.init();
  return app;
}

export async function getPrisma(app: INestApplication): Promise<PrismaService> {
  return app.get(PrismaService);
}

/** Extract access token from a login response body. */
export function extractAccessToken(body: { data?: { accessToken?: string } }): string {
  return body?.data?.accessToken ?? '';
}

/** Extract the Set-Cookie header value for the refresh token. */
export function extractRefreshCookie(headers: Record<string, string | string[]>): string {
  const raw = headers['set-cookie'];
  if (!raw) return '';
  const cookies = Array.isArray(raw) ? raw : [raw];
  return cookies.find((c) => c.startsWith('refresh_token=')) ?? '';
}

/** Unique e2e-only email so tests never clash with seeded users. */
export const E2E_PREFIX = 'e2e-test-';

export const SEED_USERS = {
  superAdmin: { email: 'superadmin@nuxion.test', password: 'super1234' },
  admin: { email: 'admin@nuxion.test', password: 'admin123' },
  user: { email: 'user@nuxion.test', password: 'user1234' },
} as const;
