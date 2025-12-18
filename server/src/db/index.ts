import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/weatherdb'
});

export const db = {
    query: (text: string, params?: any[]) => pool.query(text, params),
    pool
};

export async function initDB() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaWrapperPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');

        // Handle path differences in dev vs prod/docker
        const finalPath = fs.existsSync(schemaPath) ? schemaPath : schemaWrapperPath;

        console.log('Initializing DB from:', finalPath);
        const schemaSql = fs.readFileSync(finalPath, 'utf8');
        await pool.query(schemaSql);
        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize database:', err);
        throw err;
    }
}
