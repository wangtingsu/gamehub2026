import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth, ProtectedRoute } from '../AuthContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Completely mock the api module with a factory to avoid parsing import.meta.env
jest.mock('../../api', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock authService used by AuthContext
jest.mock('../../api/authService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    loginByPhone: jest.fn(),
    registerByPhone: jest.fn(),
    sendSmsCode: jest.fn(),
    getCurrentUser: jest.fn().mockRejectedValue(new Error('No token')),
    getOAuthProviders: jest.fn(),
    getOAuthUrl: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    getTwoFactorStatus: jest.fn(),
    setupTwoFactor: jest.fn(),
    enableTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
    verifyTwoFactor: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Store reference to mocked api module
const mockedApiModule = jest.requireMock('../../api') as { default: { login: jest.Mock } };

// Mock child component to consume auth context
const TestConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="isAuthenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="isLoading">{auth.isLoading.toString()}</div>
      <div data-testid="user">{auth.user ? auth.user.email : 'null'}</div>
      <button onClick={() => auth.login({ email: 'test@test.com', password: 'password' }).catch(() => {})}>
        Login
      </button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
};

// Mock component for protected route testing
const MockComponent = () => <div data-testid="protected-content">Protected</div>;

describe('AuthContext', () => {
  let mockedApi: { login: jest.Mock };
  let mockedAuthService: {
    login: jest.Mock;
    getCurrentUser: jest.Mock;
    logout: jest.Mock;
    register: jest.Mock;
    loginByPhone: jest.Mock;
    registerByPhone: jest.Mock;
    sendSmsCode: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Get fresh reference to mocked api module
    const apiModule = require('../../api');
    mockedApi = apiModule.default;

    // Get fresh reference to mocked authService
    const { authService: asMock } = jest.requireMock('../../api/authService');
    mockedAuthService = asMock;

    // Default: getCurrentUser rejects (no token)
    mockedAuthService.getCurrentUser.mockRejectedValue(new Error('No token'));

    mockedAxios.create.mockReturnValue({
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
    } as any);
    mockedAxios.defaults.headers.common = {};
  });

  describe('AuthProvider', () => {
    it('should render children and provide initial auth state', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should load user from localStorage if token exists', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        role: 'user' as const,
      };
      mockedAuthService.getCurrentUser.mockResolvedValue(mockUser);
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
      expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
    });

    it('should handle login success', async () => {
      const mockAuthResponse = {
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@test.com',
          role: 'user' as const,
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      mockedAuthService.login.mockResolvedValue(mockAuthResponse);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await userEvent.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(mockedAuthService.login).toHaveBeenCalledWith(
          { email: 'test@test.com', password: 'password' }
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
      expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
      expect(localStorage.getItem('accessToken')).toBe('access-token');
    });

    it('should handle login failure', async () => {
      mockedAuthService.login.mockRejectedValue(new Error('Login failed'));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await userEvent.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(mockedAuthService.login).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });

    it('should handle logout', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        role: 'user' as const,
      };
      mockedAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockedAuthService.logout.mockResolvedValue(undefined);
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      await userEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('useAuth', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useAuth必须在AuthProvider内使用');

      console.error = consoleError;
    });
  });

  describe('ProtectedRoute', () => {
    it('should render children when authenticated', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        role: 'user' as const,
      };
      mockedAuthService.getCurrentUser.mockResolvedValue(mockUser);
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <ProtectedRoute>
            <MockComponent />
          </ProtectedRoute>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should render fallback when not authenticated', async () => {
      localStorage.clear();

      render(
        <AuthProvider>
          <ProtectedRoute fallback={<div data-testid="fallback">Please login</div>}>
            <MockComponent />
          </ProtectedRoute>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
      });
    });

    it('should render fallback when requireAdmin but user is not admin', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        role: 'user' as const,
      };
      mockedAuthService.getCurrentUser.mockResolvedValue(mockUser);
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <ProtectedRoute requireAdmin fallback={<div data-testid="fallback">Admin required</div>}>
            <MockComponent />
          </ProtectedRoute>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
      });
    });

    it('should render children when requireAdmin and user is admin', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin' as const,
      };
      mockedAuthService.getCurrentUser.mockResolvedValue(mockUser);
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <ProtectedRoute requireAdmin>
            <MockComponent />
          </ProtectedRoute>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });
});
