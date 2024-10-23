import path from 'path';

import dotenv from 'dotenv';

// Cargar variables de entorno de test
const result = dotenv.config({
  path: path.join(__dirname, '../../../.env.test'),
});

if (result.error) {
  console.warn('No .env.test file found. Using default test values.');

  // Establecer valores por defecto para tests
  process.env.DB_USER = 'test_user';
  process.env.DB_HOST = 'localhost';
  process.env.DB_DATABASE = 'expense_tracker_test';
  process.env.DB_PASSWORD = 'test_password';
  process.env.DB_PORT = '5433';
  process.env.DB_SSL = 'false';

  process.env.AUTH_DOMAIN = 'test-domain';
  process.env.AUTH_AUDIENCE = 'test-audience';
  process.env.AUTH_CLIENT_ID = 'test-client-id';
  process.env.AUTH_CLIENT_SECRET = 'test-client-secret';
  process.env.AUTH_JWKS_URI = 'test-jwks-uri';
  process.env.AUTH_ISSUER = 'https://test-domain/';

  process.env.OPENAI_API_KEY = 'test-api-key';
  process.env.OPENAI_MODEL = 'test-model';
}

// Set NODE_ENV to 'test' to avoid accidentally connecting to production database
process.env.NODE_ENV = 'test';

// Global mock for pg.Pool
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock logger to avoid unnecessary logs during tests
jest.mock('../../../src/config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  verbose: jest.fn(),
  debug: jest.fn(),
  silly: jest.fn(),
}));

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Mock OpenAI client and SDK
const mockOpenAIResponse = {
  choices: [{ message: { content: 'Mocked OpenAI response' } }],
};

// Mock the OpenAI SDK
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(mockOpenAIResponse),
      },
    },
  })),
}));

// Mock our OpenAI client
jest.mock('../../../src/services/external/clients/openaiClient', () => ({
  default: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(mockOpenAIResponse),
      },
    },
  },
}));

// Mock database client
jest.mock('../../../src/services/external/clients/dbClient', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  return { default: mPool };
});
