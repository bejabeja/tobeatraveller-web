import fs from 'fs'
import path from 'path'
import pkg from 'pg'
import config from '../config/config.js'

const { Client } = pkg

const client = config.databaseUrl
    ? new Client({
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false },
    })
    : new Client({
        host: config.dbHost,
        user: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
        port: config.dbPort,
    });

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Successfully connected to PostgreSQL')

        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        console.log(__dirname)

        // Read migration files only from the 'sql' subfolder
        const migrationFiles = fs.readdirSync(path.join(__dirname, '../migrations/sql'))
            .filter(file => file.endsWith('.sql'))
            .sort();

        // Create the 'migrations' table if it doesn't exist
        await client.query(`
         CREATE TABLE IF NOT EXISTS migrations (
             id SERIAL PRIMARY KEY,
             name VARCHAR(255) UNIQUE NOT NULL,
             executed_at TIMESTAMP DEFAULT NOW()
         );
     `);

        // Get the list of already applied migrations
        const { rows: appliedMigrations } = await client.query('SELECT name FROM migrations');

        // Execute the migrations that have not been applied yet
        for (let i = 0; i < migrationFiles.length; i++) {
            const migrationFile = migrationFiles[i];

            if (appliedMigrations.some(m => m.name === migrationFile)) {
                console.log(`Skipping already applied migration: ${migrationFile}`);
                continue;
            }

            const migrationPath = path.join(__dirname, '../migrations/sql', migrationFile);
            const migrationQuery = fs.readFileSync(migrationPath, 'utf8');

            console.log(`Running migration: ${migrationFile}`);
            await client.query(migrationQuery);

            await client.query('INSERT INTO migrations (name) VALUES ($1)', [migrationFile]);
        }

        console.log('✅ Successfully migrations completed');
    } catch (error) {
        console.error('❌ Error running migrations:', error);
    } finally {
        await client.end();
    }
}

runMigration();
