/**
 * RBAC 权限配置
 *
 * 权限矩阵：角色 × 功能模块
 * 角色: super_admin | admin | operator | user
 */

export type Role = 'super_admin' | 'admin' | 'operator' | 'user';

/** 功能模块 key */
export type PermissionKey =
  | 'frontend_access'
  | 'admin_login'
  | 'dashboard'
  | 'analytics'
  | 'profiling'
  | 'users'
  | 'monitoring'
  | 'audit_logs'
  | 'deployments'
  | 'backups'
  | 'files'
  | 'email'
  | 'notifications'
  | 'games'
  | 'recommend'
  | 'review_queue'
  | 'content_news'
  | 'content_blogs'
  | 'content_guides'
  | 'content_reviews'
  | 'content_community'
  | 'content_spaces'
  | 'about'
  | 'settings';

/** 权限矩阵：定义每个角色拥有哪些功能 */
const PERMISSIONS: Record<Role, PermissionKey[]> = {
  super_admin: [
    'frontend_access',
    'admin_login',
    'dashboard',
    'analytics',
    'profiling',
    'users',
    'monitoring',
    'audit_logs',
    'deployments',
    'backups',
    'files',
    'email',
    'notifications',
    'games',
    'recommend',
    'review_queue',
    'content_news',
    'content_blogs',
    'content_guides',
    'content_reviews',
    'content_community',
    'content_spaces',
    'about',
    'settings',
  ],
  admin: [
    'frontend_access',
    'admin_login',
    'dashboard',
    'analytics',
    'profiling',
    'users',
    'monitoring',
    'audit_logs',
    'notifications',
    'games',
    'recommend',
    'review_queue',
    'content_news',
    'content_blogs',
    'content_guides',
    'content_reviews',
    'content_community',
    'content_spaces',
    'about',
    'settings',
  ],
  operator: [
    'frontend_access',
    'admin_login',
    'dashboard',
    'content_news',
    'content_blogs',
    'content_guides',
    'content_reviews',
    'content_community',
    'content_spaces',
  ],
  user: [
    'frontend_access',
  ],
};

/** 管理员侧边栏菜单 key → 权限 key 映射 */
export const MENU_PERMISSION_MAP: Record<string, PermissionKey> = {
  '/admin/dashboard': 'dashboard',
  '/admin/analytics': 'analytics',
  '/admin/profiling': 'profiling',
  '/admin/users': 'users',
  '/admin/monitoring': 'monitoring',
  '/admin/audit-logs': 'audit_logs',
  '/admin/deployments': 'deployments',
  '/admin/backups': 'backups',
  '/admin/uploads': 'files',
  '/admin/email': 'email',
  '/admin/notifications': 'notifications',
  '/admin/games': 'games',
  '/admin/recommend': 'recommend',
  '/admin/review-queue': 'review_queue',
  '/admin/content': 'content_news',
  '/admin/content/news': 'content_news',
  '/admin/content/blogs': 'content_blogs',
  '/admin/content/guides': 'content_guides',
  '/admin/content/reviews': 'content_reviews',
  '/admin/content/community': 'content_community',
  '/admin/content/blogspaces': 'content_spaces',
  '/admin/about': 'about',
  '/admin/settings': 'settings',
};

/**
 * 检查角色是否拥有指定权限
 */
export function hasPermission(role: Role, permission: PermissionKey): boolean {
  return (PERMISSIONS[role] || []).includes(permission);
}

/**
 * 获取角色的所有权限列表
 */
export function getPermissions(role: Role): PermissionKey[] {
  return PERMISSIONS[role] || [];
}

/**
 * 获取角色的菜单路径列表
 */
export function getMenuPaths(role: Role): string[] {
  const perms = getPermissions(role);
  return Object.entries(MENU_PERMISSION_MAP)
    .filter(([, perm]) => perms.includes(perm))
    .map(([menu]) => menu);
}

export default PERMISSIONS;
