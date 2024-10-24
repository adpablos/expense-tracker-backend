import * as path from 'path';

import * as dotenv from 'dotenv';

// Primero, limpiamos las variables de entorno existentes relacionadas con la base de datos
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('DB_')) {
    delete process.env[key];
  }
});

// Cargamos el archivo .env.staging
const result = dotenv.config({
  path: path.resolve(__dirname, '../.env.staging'),
  override: true, // Forzar la sobrescritura de variables existentes
});

if (result.error) {
  console.error('Error loading .env.staging:', result.error);
  process.exit(1);
}

console.log('Loaded .env file:', path.resolve(__dirname, '../.env.staging'));
console.log('\nEnvironment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_SSL:', process.env.DB_SSL);

// Verificar que las variables coinciden con las esperadas
const expectedValues = {
  DB_USER: 'postgres',
  DB_HOST: 'roundhouse.proxy.rlwy.net',
  DB_DATABASE: 'railway',
  DB_PORT: '21940',
  DB_SSL: 'true',
};

console.log('\nVerificación de valores:');
Object.entries(expectedValues).forEach(([key, value]) => {
  console.log(
    `${key}: ${process.env[key] === value ? '✅' : '❌'} (esperado: ${value}, actual: ${process.env[key]})`
  );
});
