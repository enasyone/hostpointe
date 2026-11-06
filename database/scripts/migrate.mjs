// Runs node-pg-migrate with MIGRATION_DATABASE_URL. Loads the repository root .env when it exists
// (local use); CI has no .env file and passes the variable through the environment instead.
// Usage: node scripts/migrate.mjs up | down
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const direction = process.argv[2];
if (direction !== 'up' && direction !== 'down') {
  console.error('Usage: node scripts/migrate.mjs up|down');
  process.exit(2);
}

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
try {
  process.loadEnvFile(rootEnv); // does not override variables already set
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const cli = fileURLToPath(new URL('../node_modules/node-pg-migrate/bin/node-pg-migrate.js', import.meta.url));
const args = [
  cli,
  direction,
  ...(direction === 'down' ? ['1'] : ['--check-order']),
  '--migrations-dir', 'migrations',
  '--database-url-var', 'MIGRATION_DATABASE_URL',
  '--migrations-table', 'pgmigrations',
];
process.exit(spawnSync(process.execPath, args, { stdio: 'inherit' }).status ?? 1);
