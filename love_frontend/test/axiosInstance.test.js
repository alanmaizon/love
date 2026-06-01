// test/axiosInstance.test.js — contract for session + CSRF (v2 security)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const instance = {
    defaults: { baseURL: '', headers: {} },
    interceptors: { request: { use: vi.fn() } },
    get: vi.fn(),
    post: vi.fn(),
  };
  return {
    default: { create: vi.fn(() => instance) },
  };
});

describe('axiosInstance', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=abc123';
    vi.resetModules();
  });

  afterEach(() => {
    document.cookie = '';
  });

  it('enables withCredentials on the shared client', async () => {
    const { default: axiosInstance } = await import('../src/api/axiosInstance');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ withCredentials: true })
    );
    expect(axiosInstance.defaults).toBeDefined();
  });

  it('registers a request interceptor that sets X-CSRFToken on POST', async () => {
    await import('../src/api/axiosInstance');
    const instance = axios.create.mock.results[0].value;
    expect(instance.interceptors.request.use).toHaveBeenCalled();
    const interceptor = instance.interceptors.request.use.mock.calls[0][0];
    const config = interceptor({ method: 'post', headers: {} });
    expect(config.headers['X-CSRFToken']).toBe('abc123');
  });

  it('does not set X-CSRFToken on GET', async () => {
    await import('../src/api/axiosInstance');
    const instance = axios.create.mock.results[0].value;
    const interceptor = instance.interceptors.request.use.mock.calls[0][0];
    const config = interceptor({ method: 'get', headers: {} });
    expect(config.headers['X-CSRFToken']).toBeUndefined();
  });
});
