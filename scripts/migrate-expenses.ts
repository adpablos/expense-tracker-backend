import fs from 'fs';
import path from 'path';

import csvParser from 'csv-parser';
import { parse, isValid, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: sslConfig,
});

async function migrateExpenses(csvFilePath: fs.PathLike) {
  let totalRecords = 0;
  let successfulInserts = 0;
  let failedInserts = 0;

  try {
    await client.connect();
    console.log('Connected to the database successfully.');

    const expenses: {
      description: any; // Validamos que haya descripción
      amount: number; // Validamos que haya una cantidad válida
      category: any;
      subcategory: any;
      expenseDatetime: Date;
    }[] = [];

    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (row) => {
        totalRecords++;

        let expenseDatetime = parse(row['Fecha'], 'MMMM d, yyyy', new Date(), { locale: enUS });

        if (!isValid(expenseDatetime)) {
          expenseDatetime = parse(row['Fecha'], 'MM/dd/yyyy', new Date());
        }

        if (!isValid(expenseDatetime)) {
          expenseDatetime = parseISO(row['Fecha']);
        }

        console.log(`Raw date: ${row['Fecha']} -> Parsed date: ${expenseDatetime}`);

        const expense = {
          description: row['﻿Expense'] || 'No description', // Validamos que haya descripción
          amount: parseFloat(row['Amount']) || 0, // Validamos que haya una cantidad válida
          category: row['Categoria'] || 'Uncategorized',
          subcategory: row['Subcategoria'] || 'Uncategorized',
          expenseDatetime: isValid(expenseDatetime) ? expenseDatetime : new Date(), // Usamos la fecha actual si la fecha es inválida
        };

        console.log('Mapped expense:', expense);

        // Guardamos el expense en la lista para procesarlos todos juntos después
        expenses.push(expense);
      })
      .on('end', async () => {
        console.log('Finished reading CSV. Now inserting into the database.');

        for (const expense of expenses) {
          try {
            await client.query(
              `INSERT INTO expenses (description, amount, category, subcategory, expense_datetime, created_at, updated_at)
                            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
              [
                expense.description,
                expense.amount,
                expense.category,
                expense.subcategory,
                expense.expenseDatetime,
              ]
            );
            successfulInserts++;
          } catch (err) {
            console.error('Error inserting expense:', err, 'Expense:', expense);
            failedInserts++;
          }
        }

        console.log('Migration completed.');
        console.log('Total records processed:', totalRecords);
        console.log('Successfully inserted:', successfulInserts);
        console.log('Failed inserts:', failedInserts);

        // Cerramos la conexión después de procesar todos los registros
        await client.end();
      });
  } catch (err) {
    console.error('Error during migration:', err);
    await client.end();
  }
}

// Path to the CSV file exported from Notion
const csvFilePath = path.join(__dirname, '../data/notion-data.csv');

// Execute the migration
migrateExpenses(csvFilePath).then(() => console.log('Migration completed.'));
