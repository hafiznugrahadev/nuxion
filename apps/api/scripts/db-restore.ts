/**
 * `bun run db:restore` — restore the database from a dump in the backup bucket.
 *
 * Env carries only the credentials + bucket; WHICH path/dump to restore is chosen
 * here at run time by browsing the bucket interactively (or via flags for CI):
 *
 *   bun run db:restore                          # browse the bucket, pick a dump
 *   bun run db:restore --path postgres/2026-07  # start browsing at that folder
 *   bun run db:restore --latest                 # newest dump under the start path
 *   bun run db:restore postgres/daily.sql.gz    # restore that exact key
 *
 * Flags: --force (required in production), --yes (skip the y/N prompt).
 */
import { createInterface } from 'node:readline/promises';
import { config } from 'dotenv';
import { backupConfig } from '../src/config/backup.config';
import {
  BackupStorageService,
  normalizePrefix,
} from '../src/infrastructure/backup/backup-storage.service';
import {
  databaseNameFromUrl,
  DatabaseRestoreService,
} from '../src/infrastructure/backup/database-restore.service';
import { browseForBackup, parseRestoreArgs } from '../src/infrastructure/backup/restore-cli';

// Single root .env (cwd = apps/api when run via `bun run --filter`). Env vars win.
config({ path: ['../../.env', '.env'] });

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

async function main(): Promise<void> {
  const args = parseRestoreArgs(process.argv.slice(2));
  const cfg = backupConfig();
  const storage = new BackupStorageService(cfg);
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) throw new Error('DATABASE_URL is not set in .env.');
  storage.assertConfigured();

  const source = cfg.driver === 's3' ? `Bucket: ${cfg.s3.bucket}` : `Dir: ${cfg.local.dir}`;
  const startPrefix = normalizePrefix(args.path ?? cfg.s3.prefix);

  // ── 1. Pick the dump ────────────────────────────────────────────────────────
  let key = args.key;
  if (!key && args.latest) {
    const [newest] = await storage.listAll(startPrefix);
    if (!newest) throw new Error(`No backups found under "/${startPrefix}" in ${source}.`);
    key = newest.key;
  }
  if (!key) {
    if (!process.stdin.isTTY) {
      throw new Error(
        'Not a TTY — cannot browse interactively. Pass a key, --latest, or --path <folder>.',
      );
    }
    console.log(bold(source));
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const picked = await browseForBackup(
        {
          list: (prefix) => storage.list(prefix),
          ask: (question) => rl.question(question),
          print: (line) => console.log(line),
        },
        startPrefix,
      );
      if (!picked) {
        console.log(dim('Dibatalkan.'));
        return;
      }
      key = picked;
    } finally {
      rl.close();
    }
  }

  // ── 2. Confirm ──────────────────────────────────────────────────────────────
  const dbName = databaseNameFromUrl(databaseUrl);
  console.log(`\n${bold('Restore')} ${key}`);
  console.log(`${bold('→ database')} ${dbName} ${dim(`(NODE_ENV=${nodeEnv})`)}`);
  console.log(red('Ini menghapus seluruh schema `public` yang ada sekarang.'));

  const isProduction = nodeEnv === 'production';
  if (isProduction && !args.force) throw new Error('Production restore requires --force.');

  if (!args.yes || isProduction) {
    if (!process.stdin.isTTY) {
      throw new Error(
        isProduction
          ? 'Production restore needs an interactive confirmation (type the DB name).'
          : 'Not a TTY — pass --yes to confirm non-interactively.',
      );
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      if (isProduction) {
        // Production needs BOTH --force and the DB name typed out, so a stray
        // --yes in shell history can never wipe prod on its own.
        const typed = (
          await rl.question(`Ketik nama database (${dbName}) untuk konfirmasi: `)
        ).trim();
        if (typed !== dbName) throw new Error('Nama database tidak cocok — dibatalkan.');
      } else {
        const yn = (await rl.question('Lanjutkan? [y/N]: ')).trim().toLowerCase();
        if (yn !== 'y' && yn !== 'yes') {
          console.log(dim('Dibatalkan.'));
          return;
        }
      }
    } finally {
      rl.close();
    }
  }

  // ── 3. Restore ──────────────────────────────────────────────────────────────
  console.log(dim('Mengunduh dump…'));
  const dump = await storage.download(key);
  console.log(dim('Menjalankan psql…'));
  await new DatabaseRestoreService().restore({
    dump,
    gzipped: key.toLowerCase().endsWith('.gz'),
    databaseUrl,
    force: args.force,
    nodeEnv,
  });

  console.log(green(`✔ Restore selesai — ${key} → ${dbName}`));
}

main().catch((error: Error) => {
  console.error(red(`✖ ${error.message}`));
  process.exit(1);
});
