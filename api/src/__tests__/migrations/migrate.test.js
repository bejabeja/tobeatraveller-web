import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const MIGRATE_SCRIPT = fileURLToPath(new URL('../../migrations/migrate.js', import.meta.url));
// Nothing listens on port 1, so the connection is refused at once and no database is touched.
const UNREACHABLE_DATABASE_URL = 'postgres://nobody:nothing@127.0.0.1:1/none';
const FAILURE_EXIT_CODE = 1;

describe('npm run migrate', () => {
    // Regression: a failed migration was only printed, and the script ended as if it had worked,
    // so whatever ran it (a deploy, a script) carried on with the database half migrated.
    it('ends with an error when the migrations cannot run', () => {
        const run = spawnSync(process.execPath, [MIGRATE_SCRIPT], {
            env: { ...process.env, DATABASE_URL: UNREACHABLE_DATABASE_URL },
            encoding: 'utf8',
            timeout: 10000,
        });

        expect(run.status).toBe(FAILURE_EXIT_CODE);
    });
});
