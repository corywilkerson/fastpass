import { vi } from 'vitest';

/**
 * Mock process.exit so it throws instead of killing the test runner.
 * Returns the spy for assertions.
 */
export function mockProcessExit() {
  return vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
}

/**
 * Suppress console output during tests. Returns spies for assertions.
 */
export function suppressConsole() {
  return {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  };
}
