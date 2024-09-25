import type { Config } from '@jest/types';

import logger from './src/config/logger';

// Configura el logger para los tests
logger.level = 'debug';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/tests/integration/**/*.test.(ts|js)',
    '**/tests/integration/?(*.)+(spec|test).[tj]s?(x)',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: false,
        isolatedModules: true,
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup/jest.setup.ts'],
  detectOpenHandles: true,
  moduleDirectories: ['node_modules', 'src'],
  roots: ['<rootDir>/src', '<rootDir>/tests/integration'],
  coverageDirectory: 'coverage/integration',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  verbose: true,
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/swagger.ts',
    'src/config/*',
    'src/index.ts',
    'src/server.ts',
  ],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results/jest',
        outputName: 'results.xml',
      },
    ],
  ],
};

export default config;
