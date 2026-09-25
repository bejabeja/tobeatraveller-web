import pkg from 'pg';
import config from '../config/config.js';
import { logger } from '../utils/logger.js';

const { Pool } = pkg;

// Neon usually wakes a suspended database up in under a second; past this,
// fail instead of leaving the request hanging (Vercel would cut it anyway).
const CONNECTION_TIMEOUT_MS = 5000;
const CONNECT_ATTEMPTS = 3;
const CONNECT_RETRY_DELAY_MS = 300;
// Network failures while opening a connection (Neon waking up, a dropped TLS
// handshake): nothing was sent yet, so trying again is safe. Timeouts aren't
// retried: each one already waited the whole timeout.
const RETRYABLE_CONNECT_ERRORS = new Set(['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'EAI_AGAIN']);

const pool = config.databaseUrl
    ? new Pool({
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    })
    : new Pool({
        host: config.dbHost,
        user: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
        port: config.dbPort,
        connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    });

// An idle connection the server closes (Neon suspending the database) is
// reported here; the pool already drops it. Unhandled, it would crash the process.
pool.on('error', (error) => logger.warn('[db] idle connection lost:', error.message));

const isRetryableConnectError = (error) => RETRYABLE_CONNECT_ERRORS.has(error.code);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connect = async () => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await pool.connect();
        } catch (error) {
            if (attempt >= CONNECT_ATTEMPTS || !isRetryableConnectError(error)) throw error;
            logger.warn(`[db] connecting failed (${error.code ?? error.message}), retrying`);
            await wait(CONNECT_RETRY_DELAY_MS * attempt);
        }
    }
};

// Same as pool.query, but retrying the connection. A query that fails once
// sent is never run again (a write would run twice); its connection is
// thrown away in case it is the one that broke.
const client = {
    async query(...args) {
        const connection = await connect();
        let failure;
        try {
            return await connection.query(...args);
        } catch (error) {
            failure = error;
            throw error;
        } finally {
            connection.release(failure);
        }
    },
};

export async function testConnection() {
    try {
        await client.query('SELECT 1');
        logger.info('✅ Successfully connected to PostgreSQL database');
    } catch (error) {
        logger.error('❌ Error connecting to PostgreSQL database:', error.stack);
    }
}

export default client;
