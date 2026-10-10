/**
 * Run with: `bun test scripts/` (the root has no Jest project; these helpers are
 * pure, and getting them wrong would corrupt every file in the repo).
 */
import { describe, expect, it } from 'bun:test';
import {
  parseArgs,
  removeEnvSection,
  removeLinesContaining,
  removeListEntry,
  removeMarkedBlock,
  removeServiceBlock,
  rename,
  replaceLiterals,
  titleCase,
  validateFrontendVariant,
  validateSlug,
} from './init-project';

describe('validateSlug', () => {
  it.each(['portal-desa', 'jdih', 'simpeg-v2'])('accepts %s', (slug) => {
    expect(validateSlug(slug)).toBe(slug);
  });

  it.each([
    ['Portal-Desa', 'uppercase is illegal in a Docker/npm name'],
    ['2fast', 'must start with a letter'],
    ['portal_desa', 'underscores are illegal in an S3 bucket name'],
    ['a', 'too short'],
    ['portal-', 'trailing dash'],
    ['portal--desa', 'doubled dash'],
  ])('rejects %s (%s)', (slug) => {
    expect(() => validateSlug(slug)).toThrow();
  });
});

describe('titleCase', () => {
  it('builds a display name from the slug', () => {
    expect(titleCase('portal-desa')).toBe('Portal Desa');
    expect(titleCase('jdih')).toBe('Jdih');
  });
});

describe('rename', () => {
  it('rewrites the package scope, the slug and the display name', () => {
    const before = [
      '"@nuxion/api": "workspace:*"',
      'container_name: nuxion-postgres',
      'POSTGRES_DB=nuxion',
      "APP_NAME = 'Nuxion'",
      'https://api.nuxion-dev.orb.local',
      '    networks: [nuxion-network]',
      'networks:',
      '  nuxion-network:',
      '    name: nuxion-network',
    ].join('\n');

    expect(rename(before, 'portal-desa', 'Portal Desa')).toBe(
      [
        '"@portal-desa/api": "workspace:*"',
        'container_name: portal-desa-postgres',
        'POSTGRES_DB=portal-desa',
        "APP_NAME = 'Portal Desa'",
        'https://api.portal-desa-dev.orb.local',
        '    networks: [portal-desa-network]',
        'networks:',
        '  portal-desa-network:',
        '    name: portal-desa-network',
      ].join('\n'),
    );
  });

  it('leaves unrelated text alone', () => {
    expect(rename('const start = kit;', 'portal-desa', 'Portal Desa')).toBe('const start = kit;');
  });

  it('is idempotent — re-running finds nothing left to rename', () => {
    const once = rename('@nuxion/api nuxion Nuxion', 'portal-desa', 'Portal Desa');
    expect(rename(once, 'portal-desa', 'Portal Desa')).toBe(once);
  });
});

describe('parseArgs', () => {
  it('defaults to a safe interactive run', () => {
    expect(parseArgs([])).toEqual({
      yes: false,
      dryRun: false,
      resetGit: false,
      force: false,
    });
  });

  it('reads --name/--display in both forms', () => {
    expect(parseArgs(['--name', 'jdih']).name).toBe('jdih');
    expect(parseArgs(['--display=JDIH Tabalong']).display).toBe('JDIH Tabalong');
  });

  it('reads --frontend in both forms and rejects invalid values', () => {
    expect(parseArgs(['--frontend', 'next']).frontend).toBe('next');
    expect(parseArgs(['--frontend=nuxt']).frontend).toBe('nuxt');
    expect(parseArgs([]).frontend).toBeUndefined();
    expect(() => parseArgs(['--frontend', ' remix'])).toThrow();
    expect(() => parseArgs(['--frontend=remix'])).toThrow();
  });

  it('reads the boolean flags and rejects unknown options', () => {
    expect(parseArgs(['-y', '--dry-run', '--reset-git', '--force'])).toMatchObject({
      yes: true,
      dryRun: true,
      resetGit: true,
      force: true,
    });
    expect(() => parseArgs(['--nope'])).toThrow('Unknown option: --nope');
  });
});

// ── frontend-variant surgery ──────────────────────────────────────────────────

describe('validateFrontendVariant', () => {
  it('accepts the two kit variants and nothing else', () => {
    expect(validateFrontendVariant('nuxt')).toBe('nuxt');
    expect(validateFrontendVariant('next')).toBe('next');
    expect(() => validateFrontendVariant('svelte')).toThrow(/nuxt.*next|next.*nuxt/);
  });
});

describe('removeLinesContaining', () => {
  it('drops matching lines and keeps the rest in order', () => {
    expect(
      removeLinesContaining(['WEB_PORT=3000', 'API_PORT=8000', '# NEXT_ note'].join('\n'), [
        'WEB_PORT=3000',
        'NEXT_',
      ]),
    ).toBe('API_PORT=8000');
  });

  it('is a no-op without needles or matches', () => {
    const content = 'a\nb';
    expect(removeLinesContaining(content, [])).toBe(content);
    expect(removeLinesContaining(content, ['zzz'])).toBe(content);
  });
});

describe('removeServiceBlock', () => {
  const compose = [
    'name: demo',
    'services:',
    '  api:',
    '    image: oven/bun:1.3.3',
    '    networks: [demo-network]',
    '',
    '  # ── web (Nuxt variant — default) ────────────────',
    '  web:',
    '    image: oven/bun:1.3.3',
    '    environment:',
    '      PORT: ${WEB_PORT:-3000}',
    '    networks: [demo-network]',
    '',
    '  # ── web-next (Next.js variant) ──────────────────',
    '  web-next:',
    '    image: oven/bun:1.3.3',
    '    environment:',
    '      PORT: ${WEB_NEXT_PORT:-8080}',
    '    networks: [demo-network]',
    '',
    '  # toolbox',
    '  db-tools:',
    '    image: demo-dbtools',
    '    networks: [demo-network]',
    '',
    'networks:',
    '  demo-network:',
    '    name: demo-network',
  ].join('\n');

  it('removes the service, its banner and its body; keeps neighbours', () => {
    expect(removeServiceBlock(compose, 'web-next')).toBe(
      [
        'name: demo',
        'services:',
        '  api:',
        '    image: oven/bun:1.3.3',
        '    networks: [demo-network]',
        '',
        '  # ── web (Nuxt variant — default) ────────────────',
        '  web:',
        '    image: oven/bun:1.3.3',
        '    environment:',
        '      PORT: ${WEB_PORT:-3000}',
        '    networks: [demo-network]',
        '',
        '  # toolbox',
        '  db-tools:',
        '    image: demo-dbtools',
        '    networks: [demo-network]',
        '',
        'networks:',
        '  demo-network:',
        '    name: demo-network',
      ].join('\n'),
    );
  });

  it('removes the first service cleanly when the next block follows', () => {
    const out = removeServiceBlock(compose, 'web');
    expect(out).not.toContain('  web:');
    expect(out).not.toContain('${WEB_PORT:-3000}');
    expect(out).toContain('  web-next:');
    expect(out).toContain('  db-tools:');
    expect(out).toContain('networks:');
  });

  it('leaves the file untouched when the service is absent', () => {
    expect(removeServiceBlock(compose, 'web-remix')).toBe(compose);
  });
});

describe('removeEnvSection', () => {
  const env = [
    '# ── Web variant: Nuxt (apps/web, port 3000) ──────',
    'NUXT_PUBLIC_SITE_URL=http://localhost:3000',
    '',
    '# ── Web variant: Next (apps/web-next, port 8080) ─',
    'WEB_NEXT_PORT=8080',
    'NEXT_API_INTERNAL_BASE=http://localhost:8000',
    '',
    '# ╭──────── PROD ─────────╮',
    '# DATABASE_URL=...',
  ].join('\n');

  it('removes one banner section up to the next banner', () => {
    expect(removeEnvSection(env, '# ── Web variant: Next')).toBe(
      [
        '# ── Web variant: Nuxt (apps/web, port 3000) ──────',
        'NUXT_PUBLIC_SITE_URL=http://localhost:3000',
        '',
        '# ╭──────── PROD ─────────╮',
        '# DATABASE_URL=...',
      ].join('\n'),
    );
  });

  it('is a no-op for a missing banner', () => {
    expect(removeEnvSection(env, '# ── Web variant: Remix')).toBe(env);
  });
});

describe('removeMarkedBlock', () => {
  const md = [
    'intro',
    '',
    '<!-- web-variant:nuxt -->',
    '### Nuxt (default)',
    'stuff',
    '<!-- /web-variant:nuxt -->',
    '',
    '<!-- web-variant:next -->',
    '### Next.js',
    'other stuff',
    '<!-- /web-variant:next -->',
    '',
    'outro',
  ].join('\n');

  it('removes exactly the marked block', () => {
    const out = removeMarkedBlock(md, 'web-variant:next');
    expect(out).not.toContain('### Next.js');
    expect(out).toContain('### Nuxt (default)');
    expect(out).toContain('outro');
  });
});

describe('removeListEntry', () => {
  const yaml = [
    'updates:',
    "  - package-ecosystem: 'npm'",
    "    directory: '/'",
    '    schedule:',
    "      interval: 'weekly'",
    "  - package-ecosystem: 'docker'",
    "    directory: '/apps/web'",
    '    schedule:',
    "      interval: 'weekly'",
    "  - package-ecosystem: 'docker'",
    "    directory: '/apps/web-next'",
    '    schedule:',
    "      interval: 'weekly'",
    "  - package-ecosystem: 'github-actions'",
    "    directory: '/'",
  ].join('\n');

  it('removes the stanza carrying the needle, keeping its siblings', () => {
    const out = removeListEntry(yaml, "directory: '/apps/web-next'");
    expect(out).not.toContain('/apps/web-next');
    expect(out).toContain("directory: '/apps/web'");
    expect(out).toContain("'github-actions'");
  });
});

describe('replaceLiterals (Next global rewrites)', () => {
  it('moves the web-next literals onto the canonical web name', () => {
    const before = [
      '"name": "@nuxion/web-next",',
      '    "serve:web-next": "turbo run dev --filter=@nuxion/web-next",',
      '      PORT: ${WEB_NEXT_PORT:-8080}',
      '      - web_next_node_modules:/app/node_modules',
      '      APP_URL: ${APP_URL:-http://localhost:${WEB_PORT:-3000}}',
      'dockerfile: apps/web-next/Dockerfile',
    ].join('\n');
    const after = replaceLiterals(before, [
      ['web_next_node_modules', 'web_node_modules'],
      ['WEB_NEXT_PORT', 'WEB_PORT'],
      ['WEB_PORT:-3000', 'WEB_PORT:-8080'],
      ['web-next', 'web'],
    ]);
    expect(after).toBe(
      [
        '"name": "@nuxion/web",',
        '    "serve:web": "turbo run dev --filter=@nuxion/web",',
        '      PORT: ${WEB_PORT:-8080}',
        '      - web_node_modules:/app/node_modules',
        '      APP_URL: ${APP_URL:-http://localhost:${WEB_PORT:-8080}}',
        'dockerfile: apps/web/Dockerfile',
      ].join('\n'),
    );
  });
});
