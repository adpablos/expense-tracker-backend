export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  ssl: boolean;
}

export const createDatabaseConfig = (): DatabaseConfig => {
  if (process.env.NODE_ENV === 'test') {
    return {
      user: 'test_user',
      host: 'localhost',
      database: 'test_db',
      password: 'test_password',
      port: 5432,
      ssl: false,
    };
  }

  // Validar configuración
  if (
    !process.env.DB_USER ||
    !process.env.DB_HOST ||
    !process.env.DB_DATABASE ||
    !process.env.DB_PORT ||
    (process.env.NODE_ENV !== 'development' && !process.env.DB_PASSWORD)
  ) {
    throw new Error('Missing required database environment variables');
  }

  return {
    user: process.env.DB_USER!,
    host: process.env.DB_HOST!,
    database: process.env.DB_DATABASE!,
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT!, 10),
    ssl: process.env.DB_SSL === 'true',
  };
};
