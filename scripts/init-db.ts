import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
    const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: sslConfig,
    });

    try {
        await client.connect();

        // Leer y ejecutar el script de creación de tablas
        const sqlScript = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
        await client.query(sqlScript);
        console.log('Tables created successfully');

        // Leer y ejecutar el script de inserción de datos
        const dataScript = fs.readFileSync(path.join(__dirname, 'init-db-data.sql'), 'utf8');
        await client.query(dataScript);
        console.log('Initial data inserted successfully');

        await client.end();

    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

initializeDatabase();
