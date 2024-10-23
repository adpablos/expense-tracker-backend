import { AppConfig } from '../../../src/config/config';

export const testEnv: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: 'test',
    npmConfigProduction: false,
  },
  db: {
    user: process.env.DB_USER || 'test_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'expense_tracker_test',
    password: process.env.DB_PASSWORD || 'test_password',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    ssl: process.env.DB_SSL === 'true',
  },
  auth: {
    domain: process.env.AUTH_DOMAIN || 'test-domain',
    audience: process.env.AUTH_AUDIENCE || 'test-audience',
    clientId: process.env.AUTH_CLIENT_ID || 'test-client-id',
    clientSecret: process.env.AUTH_CLIENT_SECRET || 'test-client-secret',
    jwksUri: process.env.AUTH_JWKS_URI || 'test-jwks-uri',
    issuer: process.env.AUTH_ISSUER || 'https://test-domain/',
    algorithms: ['RS256'],
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'test-api-key',
    model: process.env.OPENAI_MODEL || 'test-model',
  },
};
