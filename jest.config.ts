import type { Config } from '@jest/types';

export default async (): Promise<Config.InitialOptions> => {
  return {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverage: false,
    collectCoverageFrom: ['lib/**/*.ts'],
    coverageReporters: ['text-summary', 'html'],
    reporters: ['default', 'jest-junit'],
    testResultsProcessor: 'jest-junit',
    testTimeout: 300000, // 5 minutes
  };
};
