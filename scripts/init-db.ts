import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: 'postgres',
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();

        // Crear la base de datos si no existe
        await client.query(`
            SELECT FROM pg_database WHERE datname = 'expense_tracker';
        `).then(async (res) => {
            if (res.rowCount === 0) {
                await client.query('CREATE DATABASE expense_tracker');
                console.log('Database created successfully');
            } else {
                console.log('Database already exists');
            }
        });

        // Cerrar la conexión al servidor principal
        await client.end();

        // Conectar a la base de datos expense_tracker
        const dbClient = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: 'expense_tracker',
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT || '5432'),
        });

        await dbClient.connect();

        // Leer y ejecutar el script de creación de tablas
        const sqlScript = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
        await dbClient.query(sqlScript);
        console.log('Tables created successfully');

        // Leer y ejecutar el script de inserción de datos
        const dataScript = fs.readFileSync(path.join(__dirname, 'init-db-data.sql'), 'utf8');
        await dbClient.query(dataScript);
        console.log('Initial data inserted successfully');

        await dbClient.end();

    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

initializeDatabase();
