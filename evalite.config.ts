/**
 * Evalite Configuration
 *
 * Configuration for LLM evaluation tests
 */

export default {
  tests: 'src/**/*.eval.ts',
  maxConcurrency: 3,
  timeout: 30000
};
