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
      user: process.env.DB_USER || 'test_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'test_db',
      password: process.env.DB_PASSWORD || 'test_password',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: process.env.DB_SSL === 'true',
    };
  }

  // Validate required environment variables
  if (
    !process.env.DB_USER ||
    !process.env.DB_HOST ||
    !process.env.DB_DATABASE ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_PORT
  ) {
    throw new Error('Missing required database environment variables');
  }

  return {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
    ssl: process.env.DB_SSL === 'true',
  };
};
