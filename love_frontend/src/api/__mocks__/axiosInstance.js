// Manual mock for axiosInstance used by component tests.
// vi.mock('../src/api/axiosInstance') auto-uses this, so the real module (which
// builds a live axios instance + interceptors at import time) is never executed.
import { vi } from 'vitest';

const axiosInstance = {
  get: vi.fn(() => Promise.resolve({ data: {} })),
  post: vi.fn(() => Promise.resolve({ data: {} })),
  put: vi.fn(() => Promise.resolve({ data: {} })),
  patch: vi.fn(() => Promise.resolve({ data: {} })),
  delete: vi.fn(() => Promise.resolve({ data: {} })),
  defaults: { baseURL: 'http://localhost:8000/api' },
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

export default axiosInstance;
