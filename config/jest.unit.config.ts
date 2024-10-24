import type { Config } from '@jest/types';

import baseConfig from './jest.config.base';

const config: Config.InitialOptions = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: ['**/tests/unit/**/*.test.(ts|js)'],
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup/jest.setup.ts'],
  coverageDirectory: 'coverage/unit',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/swagger.ts',
    'src/config/*',
    'src/index.ts',
    'src/server.ts',
  ],
};

export default config;
