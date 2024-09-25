import dotenv from 'dotenv';

// Load environment variables from .env.test file
dotenv.config({ path: '.env.test' });

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

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked OpenAI response' } }],
        }),
      },
    },
  })),
}));

jest.mock('../../../src/config/openaiConfig', () => ({
  clientOpenAI: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked OpenAI response' } }],
        }),
      },
    },
  },
}));
