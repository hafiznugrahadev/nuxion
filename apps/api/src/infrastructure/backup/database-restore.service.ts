import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

export interface RestoreInput {
  /** The dump bytes, as stored (gzipped when `gzipped` is true). */
  dump: Readable;
  /** Whether `dump` needs gunzipping before it reaches `psql`. */
  gzipped: boolean;
  databaseUrl: string;
  /** Required in production — the caller owns the human confirmation. */
  force: boolean;
  nodeEnv: string;
}

/** `postgresql://user:pass@host:5432/nuxion?schema=public` → `nuxion`. */
export function databaseNameFromUrl(databaseUrl: string): string {
  try {
    return decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, '')) || '(unknown)';
  } catch {
    return '(unknown)';
  }
}

const RESET_SCHEMA_SQL = 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;';

/**
 * Restores a plain-SQL dump into the target database.
 *
 * Uses the `psql` binary rather than the `pg` driver on purpose: a `pg_dump` text
 * dump contains meta-commands (`COPY … FROM stdin`, `\.`) that only `psql` can
 * execute. Gunzipping happens in-process (`zlib`), so no `gzip` binary is needed.
 *
 * The restore is destructive and NOT transactional across the two steps: the
 * schema is dropped first, then the dump is applied. If the dump fails to apply,
 * the database is left with an empty `public` schema — re-run with a good dump.
 */
export class DatabaseRestoreService {
  async restore(input: RestoreInput): Promise<void> {
    if (input.nodeEnv === 'production' && !input.force) {
      throw new Error('Refusing to restore in production without --force.');
    }

    await this.runPsql(input.databaseUrl, ['-c', RESET_SCHEMA_SQL]);
    await this.runPsql(
      input.databaseUrl,
      [],
      input.gzipped ? input.dump.pipe(createGunzip()) : input.dump,
    );
  }

  /**
   * Spawns `psql` with `ON_ERROR_STOP=1` so the first failing statement aborts
   * instead of the dump limping through half-applied. Rejects with psql's stderr.
   */
  private runPsql(databaseUrl: string, args: string[], stdin?: Readable): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-q', ...args], {
        stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'],
      });

      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        // Keep only the tail — a failing dump can emit megabytes of notices.
        stderr = `${stderr}${chunk.toString()}`.slice(-8000);
      });

      child.on('error', (error: NodeJS.ErrnoException) => {
        reject(
          error.code === 'ENOENT'
            ? new Error(
                'The "psql" binary was not found. Install the PostgreSQL client ' +
                  '(macOS: brew install libpq && brew link --force libpq; Debian: apt install postgresql-client).',
              )
            : error,
        );
      });

      child.on('close', (code) => {
        if (code === 0) return resolvePromise();
        reject(new Error(`psql exited with code ${code}${stderr ? `:\n${stderr.trim()}` : '.'}`));
      });

      if (stdin && child.stdin) {
        stdin.on('error', reject);
        stdin.pipe(child.stdin);
      }
    });
  }
}
