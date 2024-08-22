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
jest.mock('./src/config/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

// Clean up mocks after each test
afterEach(() => {
    jest.clearAllMocks();
});

// Global setup for Jest timeout
jest.setTimeout(30000);