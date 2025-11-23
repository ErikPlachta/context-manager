import { defineConfig } from 'evalite';

export default defineConfig({
  tests: 'tests/eval/**/*.eval.ts',
  maxConcurrency: 3,
  timeout: 30000
});
