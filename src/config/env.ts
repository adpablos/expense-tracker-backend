import * as path from 'path';

import * as dotenv from 'dotenv';

// Cargar el archivo .env correspondiente según el entorno
const envFile =
  process.env.NODE_ENV === 'staging'
    ? '.env.staging'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
  override: true,
});

interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  ssl: boolean;
}

interface EnvConfig {
  nodeEnv: string;
  port: number;
  database: DatabaseConfig;
  auth0: {
    domain: string;
    audience: string;
    clientId: string;
    clientSecret: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
}

export const getEnvConfig = (): EnvConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    user: process.env.DB_USER || '',
    host: process.env.DB_HOST || '',
    database: process.env.DB_DATABASE || '',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: process.env.DB_SSL === 'true',
  },
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    audience: process.env.AUTH0_AUDIENCE || '',
    clientId: process.env.AUTH0_CLIENT_ID || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },
});
