import type { Config } from '@jest/types';

import baseConfig from './jest.config.base';

const config: Config.InitialOptions = {
  ...baseConfig,
  rootDir: '../',
  displayName: 'integration',
  testMatch: ['<rootDir>/tests/integration/**/*.test.(ts|js)'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup/jest.setup.ts'],
  coverageDirectory: 'coverage/integration',
  detectOpenHandles: true,
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
