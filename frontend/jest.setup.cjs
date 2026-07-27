// jest.setup.cjs
require('@testing-library/jest-dom');

// Polyfill TextEncoder/TextDecoder for jsdom
const { TextEncoder, TextDecoder } = require('util');
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

// Polyfill MessageChannel for React 19 scheduler (jsdom doesn't implement it)
if (typeof global.MessageChannel === 'undefined') {
  global.MessageChannel = class MessageChannel {
    constructor() {
      const channel = new (require('worker_threads').MessageChannel)();
      this.port1 = channel.port1;
      this.port2 = channel.port2;
    }
  };
}

// Polyfill ResizeObserver for antd (jsdom doesn't implement it)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia for antd components (jsdom doesn't implement it)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  }),
});

// Wrap getComputedStyle to handle antd CSS selectors that nwsapi can't parse
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt, pseudoElt) => {
  try {
    return originalGetComputedStyle(elt, pseudoElt);
  } catch {
    // Return minimal style for malformed selectors antd generates (e.g. repeated commas)
    const style = {};
    style.getPropertyValue = () => '';
    return style;
  }
};

// Also set process.env for compatibility with the getEnv function
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api/v1';
process.env.VITE_USE_MOCK = 'false';
process.env.VITE_LOG_PERFORMANCE = 'false';
process.env.VITE_APP_ENV = 'test';
process.env.PROD = 'false';
process.env.MODE = 'test';
process.env.DEV = 'false';
process.env.SSR = 'false';
process.env.NODE_ENV = 'test';