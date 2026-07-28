import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { authService } from '../api/authService';

// 用户类型定义
export interface User {
  id: number | string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  role: 'super_admin' | 'admin' | 'user';
  level?: number;
  totalLoginTime?: number;
  createdAt?: string;
  updatedAt?: string;
  reviewCount?: number;
  commentCount?: number;
  favoriteCount?: number;
}

// 认证响应类型
export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// 登录凭据
export interface LoginCredentials {
  email: string;
  password: string;
}

// 手机号登录凭据
export interface LoginByPhoneCredentials {
  phone: string;
  code: string;
}

// 注册凭据
export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  region?: string;
}

// 手机号注册凭据
export interface RegisterByPhoneCredentials {
  username: string;
  phone: string;
  code: string;
  password: string;
  displayName?: string;
  region?: string;
}

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginByPhone: (credentials: LoginByPhoneCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  registerByPhone: (credentials: RegisterByPhoneCredentials) => Promise<void>;
  sendSmsCode: (phone: string, type: 'login' | 'register' | 'bind' | 'unbind') => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  // 2FA
  twoFactorRequired: boolean;
  twoFactorEmail: string;
  verifyTwoFactor: (code: string) => Promise<void>;
  cancelTwoFactor: () => void;
}

// 创建上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider组件属性
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider组件
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [partialAuthToken, setPartialAuthToken] = useState<string | null>(null);

  // 使用useMemo缓存计算值，避免每次渲染都重新计算
  const isSuperAdmin = useMemo(() => user?.role === 'super_admin', [user?.role]);
  const isAdmin = useMemo(() => user?.role === 'super_admin' || user?.role === 'admin', [user?.role]);
  const isAuthenticated = useMemo(() => !!user, [user]);

  // 检查认证状态 - 向后端验证令牌有效性
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // 设置axios默认头部
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // 向后端发送请求验证令牌有效性，并获取最新用户信息
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      // 同步更新localStorage中的用户信息
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (error) {
      console.error('认证检查失败，令牌无效或已过期:', error);
      // 清除无效的认证信息
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setUser]);

  // 初始化检查认证状态（必须通过登录页输入密码，不允许默认登录）
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);


  // 登录函数 - 使用useCallback缓存函数引用
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const authData: any = await authService.login(credentials);

      // 检测是否需要双因素认证
      if (authData.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTwoFactorEmail(credentials.email);
        setPartialAuthToken(authData.tokens.accessToken);
        setIsLoading(false);
        // 抛出一个特殊错误来阻止后续导航
        const err = new Error('双因素认证需要验证') as any;
        err.code = 'TWO_FACTOR_REQUIRED';
        throw err;
      }

      // 保存用户信息和token
      setUser(authData.user);
      localStorage.setItem('accessToken', authData.tokens.accessToken);
      localStorage.setItem('refreshToken', authData.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(authData.user));

      // 设置axios默认头部
      axios.defaults.headers.common['Authorization'] = `Bearer ${authData.tokens.accessToken}`;
    } catch (error) {
      console.error('登录错误:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setUser]);

  // 注册函数 - 使用useCallback缓存函数引用
  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);
      // 注册只发送验证邮件，不创建用户，不保存token
      await authService.register(credentials);
    } catch (error) {
      console.error('注册错误:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  // 手机号登录
  const loginByPhone = useCallback(async (credentials: LoginByPhoneCredentials) => {
    try {
      setIsLoading(true);
      const authData = await authService.loginByPhone(credentials);

      setUser(authData.user);
      localStorage.setItem('accessToken', authData.tokens.accessToken);
      localStorage.setItem('refreshToken', authData.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(authData.user));

      axios.defaults.headers.common['Authorization'] = `Bearer ${authData.tokens.accessToken}`;
    } catch (error) {
      console.error('手机号登录错误:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setUser]);

  // 手机号注册
  const registerByPhone = useCallback(async (credentials: RegisterByPhoneCredentials) => {
    try {
      setIsLoading(true);
      const authData = await authService.registerByPhone(credentials);

      setUser(authData.user);
      localStorage.setItem('accessToken', authData.tokens.accessToken);
      localStorage.setItem('refreshToken', authData.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(authData.user));

      axios.defaults.headers.common['Authorization'] = `Bearer ${authData.tokens.accessToken}`;
    } catch (error) {
      console.error('手机号注册错误:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setUser]);

  // 发送短信验证码
  const sendSmsCode = useCallback(async (phone: string, type: 'login' | 'register' | 'bind' | 'unbind') => {
    await authService.sendSmsCode({ phone, type });
  }, []);

  // 验证双因素认证
  const verifyTwoFactor = useCallback(async (code: string) => {
    if (!partialAuthToken) throw new Error('缺少认证令牌');
    const result = await authService.verifyTwoFactor(partialAuthToken, code);

    // 保存用户信息和token
    setUser(result.user);
    localStorage.setItem('accessToken', result.tokens.accessToken);
    localStorage.setItem('refreshToken', result.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));

    // 设置axios默认头部
    axios.defaults.headers.common['Authorization'] = `Bearer ${result.tokens.accessToken}`;

    // 重置2FA状态
    setTwoFactorRequired(false);
    setTwoFactorEmail('');
    setPartialAuthToken(null);
  }, [partialAuthToken]);

  // 取消双因素认证（返回登录）
  const cancelTwoFactor = useCallback(() => {
    setTwoFactorRequired(false);
    setTwoFactorEmail('');
    setPartialAuthToken(null);
  }, []);

  // 登出函数 - 使用useCallback缓存函数引用
  const logout = useCallback(() => {
    // 先清除本地状态（确保 UI 立即反映登出状态）
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];

    // 异步通知后端递增 token 版本号，使旧令牌失效
    // 使用 try/catch 确保即使网络错误也不会阻止本地登出
    authService.logout().catch(() => {
      // 静默失败：本地状态已清除，后端令牌过期后自然失效
    });
  }, [setUser]);

  // 使用useMemo缓存上下文值，避免每次渲染都创建新对象
  const contextValue: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    login,
    loginByPhone,
    register,
    registerByPhone,
    sendSmsCode,
    logout,
    checkAuth,
    twoFactorRequired,
    twoFactorEmail,
    verifyTwoFactor,
    cancelTwoFactor,
  }), [user, isLoading, isAuthenticated, isAdmin, isSuperAdmin, login, loginByPhone, register, registerByPhone, sendSmsCode, logout, checkAuth, twoFactorRequired, twoFactorEmail, verifyTwoFactor, cancelTwoFactor]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证上下文的hook
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内使用');
  }
  return context;
};

// 受保护的路由组件
interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  fallback = null,
}) => {
  const { isAuthenticated, isLoading, isAdmin, isSuperAdmin } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>;
  }

  // 检查认证
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // 检查管理员权限
  if (requireAdmin && !isAdmin) {
    return <>{fallback}</>;
  }

  // 检查超级管理员权限
  if (requireSuperAdmin && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};