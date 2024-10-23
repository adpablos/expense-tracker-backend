import { Auth0Config } from '../../../src/config/auth';
import { AppConfig } from '../../../src/config/config';

const testConfig: AppConfig = {
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
    domain: 'test-domain',
    audience: 'test-audience',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    jwksUri: 'test-jwks-uri',
    algorithms: ['RS256'],
  } as Auth0Config,
  openai: {
    apiKey: 'test-api-key',
    model: 'test-model',
  },
};

export default testConfig;
