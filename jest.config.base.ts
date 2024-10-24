import type { Config } from '@jest/types';
import { defaults as tsjPreset } from 'ts-jest/presets';

const baseConfig: Config.InitialOptions = {
  ...tsjPreset,
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      diagnostics: {
        ignoreCodes: [1005, 1110, 1125, 7006],
        warnOnly: true,
      },
      isolatedModules: true,
    },
  },
};

export default baseConfig;
