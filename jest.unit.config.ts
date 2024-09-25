import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/tests/unit/**/*.test.(ts|js)', '**/tests/unit/?(*.)+(spec|test).[tj]s?(x)'],
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
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup/jest.setup.ts'],
  moduleDirectories: ['node_modules', 'src'],
  roots: ['<rootDir>/src', '<rootDir>/tests/unit'],
  coverageDirectory: 'coverage/unit',
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
};

export default config;
