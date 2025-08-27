// jest.setup.ts
jest.mock('./src/config/db');

// Provide a dummy OpenAI API key so the OpenAI client doesn't throw during tests
process.env.OPENAI_API_KEY = 'test-key';
