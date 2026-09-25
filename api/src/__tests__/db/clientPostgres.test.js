import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pool = vi.hoisted(() => ({ connect: vi.fn(), on: vi.fn() }));

vi.mock('pg', () => ({ default: { Pool: vi.fn(function Pool() { return pool; }) } }));
vi.mock('../../config/config.js', () => ({ default: { databaseUrl: 'postgres://db.test/app' } }));
vi.mock('../../utils/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import client from '../../db/clientPostgres.js';
import { logger } from '../../utils/logger.js';

const networkError = (code = 'ECONNRESET') => Object.assign(new Error('Client network socket disconnected before secure TLS connection was established'), { code });
const connection = (result = { rows: [{ ok: 1 }] }) => ({ query: vi.fn().mockResolvedValue(result), release: vi.fn() });

describe('clientPostgres', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        pool.connect.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // Neon suspends an idle database: while it wakes up, opening a connection
    // can fail. Nothing was sent yet, so trying again is safe.
    it('tries again to open the connection when the network drops it, then runs the query', async () => {
        const conn = connection();
        pool.connect.mockRejectedValueOnce(networkError()).mockResolvedValueOnce(conn);

        const pending = client.query('SELECT $1', [1]);
        await vi.runAllTimersAsync();

        await expect(pending).resolves.toEqual({ rows: [{ ok: 1 }] });
        expect(conn.query).toHaveBeenCalledWith('SELECT $1', [1]);
        expect(conn.release).toHaveBeenCalledWith(undefined);
    });

    it('gives up after a few attempts, with the network error', async () => {
        pool.connect.mockRejectedValue(networkError('ECONNREFUSED'));

        const pending = client.query('SELECT 1');
        const assertion = expect(pending).rejects.toMatchObject({ code: 'ECONNREFUSED' });
        await vi.runAllTimersAsync();

        await assertion;
        expect(pool.connect.mock.calls.length).toBeGreaterThan(1);
    });

    // Each timeout already waited the whole timeout: retrying could outlast the request.
    it('does not retry a connection that timed out', async () => {
        pool.connect.mockRejectedValue(new Error('timeout exceeded when trying to connect'));

        await expect(client.query('SELECT 1')).rejects.toThrow('timeout exceeded');
        expect(pool.connect).toHaveBeenCalledTimes(1);
    });

    it('does not retry an error that is not the network, like wrong credentials', async () => {
        pool.connect.mockRejectedValue(Object.assign(new Error('password authentication failed'), { code: '28P01' }));

        await expect(client.query('SELECT 1')).rejects.toMatchObject({ code: '28P01' });
        expect(pool.connect).toHaveBeenCalledTimes(1);
    });

    // Once sent, a query may have run (a write would run twice).
    it('never runs a failed query again, and throws the broken connection away', async () => {
        const conn = connection();
        const lost = new Error('Connection terminated unexpectedly');
        conn.query.mockRejectedValue(lost);
        pool.connect.mockResolvedValue(conn);

        await expect(client.query('INSERT INTO t VALUES (1)')).rejects.toBe(lost);
        expect(conn.query).toHaveBeenCalledTimes(1);
        expect(conn.release).toHaveBeenCalledWith(lost);
    });

    // Without a listener, an idle connection dying would crash the process.
    it('logs a connection that dies while idle instead of crashing', () => {
        const [event, onError] = pool.on.mock.calls.find(([name]) => name === 'error');
        const dropped = new Error('Connection terminated unexpectedly');

        expect(event).toBe('error');
        expect(() => onError(dropped)).not.toThrow();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('idle'), dropped.message);
    });
});
