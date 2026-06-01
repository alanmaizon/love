// test/setupTests.js
import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// AuthContext and the Login success path use BroadcastChannel to sync auth
// across tabs. Always replace it with a no-op stub: node's real implementation
// opens cross-worker channels that can leak between test files in vitest's
// reused workers, making suites nondeterministic. Tests never need real IPC.
globalThis.BroadcastChannel = class {
  constructor() {}
  postMessage() {}
  close() {}
  set onmessage(_) {}
};

// jsdom + vitest can ship a broken localStorage (see --localstorage-file warning).
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
