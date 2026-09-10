/**
 * 上传图片到服务器，返回 URL
 *
 * 管理后台（/admin 路径）走 /admin-api，用户端走 /api。
 * 供 BlogEditor 与 InsertTableModal 共用。
 */
export async function uploadToServer(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('adminToken');
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.includes('/admin');
  const uploadUrl = isAdmin ? '/admin-api/v1/upload/image' : '/api/v1/upload/image';
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.file?.url || null;
}
