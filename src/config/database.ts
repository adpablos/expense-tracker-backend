import { getEnvConfig } from './env';

export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  ssl: boolean;
}

export const createDatabaseConfig = (): DatabaseConfig => {
  const config = getEnvConfig();
  const { database } = config;

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
    !database.user ||
    !database.host ||
    !database.database ||
    !database.port ||
    (process.env.NODE_ENV !== 'development' && !database.password)
  ) {
    throw new Error('Missing required database environment variables');
  }

  return database;
};
