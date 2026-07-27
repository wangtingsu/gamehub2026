import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

// Mock the api module
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
    getOAuthProviders: jest.fn().mockResolvedValue({ providers: [] }),
  },
}));

// Mock the auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useSmsCountdown hook
jest.mock('../../hooks/useSmsCountdown', () => ({
  useSmsCountdown: () => ({ countdown: 0, start: jest.fn() }),
}));

// Mock SEO component
jest.mock('../../components/SEO', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ lang: 'cn' }),
  useLocation: () => ({ pathname: '/cn/login' }),
}));

// Initialize i18n for testing
i18n.init({
  lng: 'zh-CN',
  resources: {
    'zh-CN': {
      translation: {
        auth: {
          loginPage: {
            title: '登录',
            subtitle: '欢迎回来',
            emailLabel: '邮箱',
            emailPlaceholder: '请输入邮箱',
            emailRequired: '请输入邮箱',
            emailInvalid: '邮箱格式不正确',
            passwordLabel: '密码',
            passwordPlaceholder: '请输入密码',
            passwordRequired: '请输入密码',
            passwordMinLength: '密码至少8位',
            loginButton: '登录',
            loggingIn: '登录中...',
            emailLogin: '邮箱登录',
            phoneLogin: '手机登录',
            bannerTitle: '欢迎回来',
            bannerNoAccount: '没有账号？',
            bannerRegister: '立即注册',
            bannerSupport: '我们将为您提供更好的体验',
            noAccount: '还没有账号？',
            registerNow: '立即注册',
            forgotPassword: '忘记密码？',
            backToLogin: '返回登录',
            backToHomePage: '返回首页',
            copyright: '© {year} GameHub',
            loginFailed: '登录失败',
            phoneLabel: '手机号',
            phoneRequired: '请输入手机号',
            phoneInvalid: '手机号格式不正确',
            codeLabel: '验证码',
            codeRequired: '请输入验证码',
            codeLength: '验证码为6位',
            sendCode: '获取验证码',
            orUseOther: '或使用其他方式',
          },
        },
      },
    },
  },
});

import { useAuth } from '../../contexts/AuthContext';

describe('LoginPage', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });
  });

  const renderLoginPage = () => {
    const LoginPage = require('../LoginPage').default;
    return render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </I18nextProvider>
    );
  };

  const switchToEmailTab = async () => {
    // 手机Tab是默认激活的，切换到邮箱Tab
    const emailTab = screen.getAllByRole('tab')[1];
    await userEvent.click(emailTab);
  };

  it('应该渲染登录表单', async () => {
    renderLoginPage();
    await switchToEmailTab();
    expect(screen.getByPlaceholderText(/请输入邮箱/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入密码/)).toBeInTheDocument();
  });

  it('登录成功时应调用login并导航', async () => {
    mockLogin.mockResolvedValueOnce({});
    renderLoginPage();
    await switchToEmailTab();

    const emailInput = screen.getByPlaceholderText(/请输入邮箱/);
    const passwordInput = screen.getByPlaceholderText(/请输入密码/);
    const submitButton = screen.getByRole('button', { name: /登录/ });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('登录失败时应显示错误信息', async () => {
    mockLogin.mockRejectedValueOnce({ response: { data: { message: '邮箱或密码错误' } } });
    renderLoginPage();
    await switchToEmailTab();

    const emailInput = screen.getByPlaceholderText(/请输入邮箱/);
    const passwordInput = screen.getByPlaceholderText(/请输入密码/);
    const submitButton = screen.getByRole('button', { name: /登录/ });

    await userEvent.type(emailInput, 'wrong@example.com');
    await userEvent.type(passwordInput, 'wrong1234');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getAllByText(/邮箱或密码错误/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });
  });

  it('加载中时应显示Spin', () => {
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    renderLoginPage();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });
});
