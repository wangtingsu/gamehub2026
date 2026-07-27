// Mock for axios
const mockAxios = {
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  })),
  defaults: {
    headers: {
      common: {},
    },
  },
};

export default mockAxios;