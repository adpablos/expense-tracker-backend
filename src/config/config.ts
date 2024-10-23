import dotenv from 'dotenv';

import { Auth0Config, createAuthConfig } from './auth';
import { DatabaseConfig, createDatabaseConfig } from './database';
import { OpenAIConfig, createOpenAIConfig } from './openai';

dotenv.config();

export interface AppConfig {
  server: {
    port: number;
    nodeEnv: string;
    npmConfigProduction: boolean;
  };
  db: DatabaseConfig;
  auth: Auth0Config;
  openai: OpenAIConfig;
}

// Validate core environment variables
const validateCoreEnvVariables = () => {
  const requiredVars = ['PORT', 'NODE_ENV', 'NPM_CONFIG_PRODUCTION'];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required core environment variables: ${missingVars.join(', ')}`);
  }
};

// Create server configuration
const createServerConfig = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  npmConfigProduction: process.env.NPM_CONFIG_PRODUCTION === 'true',
});

validateCoreEnvVariables();

const config: AppConfig = {
  server: createServerConfig(),
  db: createDatabaseConfig(),
  auth: createAuthConfig(),
  openai: createOpenAIConfig(),
};

export default config;
