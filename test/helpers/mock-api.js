import { vi } from 'vitest';

/**
 * Create a mock API object matching the shape returned by createApi().
 * Each method is a vi.fn() that can be configured per test.
 */
export function createMockApi() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}
