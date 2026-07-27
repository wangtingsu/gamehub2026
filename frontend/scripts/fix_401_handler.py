import sys, re

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    content = f.read()

old_start = "// 401未授权，尝试刷新Token（仅浏览器环境）"
start_idx = content.find(old_start)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    sys.exit(1)

# Find the complete if block from "if (status === 401" to the closing "}"
find_from = content.find("if (status === 401", start_idx)
if find_from == -1:
    print("ERROR: Could not find if block")
    sys.exit(1)

# Count braces to find the end of this block
brace_count = 0
in_block = False
end_idx = -1
i = find_from
while i < len(content):
    if content[i] == '{':
        brace_count += 1
        in_block = True
    elif content[i] == '}':
        brace_count -= 1
        if in_block and brace_count == 0:
            end_idx = i + 1
            break
    i += 1

if end_idx == -1:
    print("ERROR: Could not find end of block")
    sys.exit(1)

old_block = content[start_idx:end_idx]

new_block = """          // 401未授权，尝试刷新Token（仅浏览器环境）
          if (status === 401 && typeof localStorage !== 'undefined') {
            const failedUrl = error.config?.url || '';
            const originalRequest = error.config;

            // 管理员API直接跳登录，不刷新
            if (failedUrl.includes('/admin/')) {
              localStorage.removeItem('adminToken');
              if (!window.location.pathname.includes('/admin/login')) {
                window.location.href = '/admin/login';
              }
              return Promise.reject(apiError);
            }

            // 避免在刷新请求自身失败时循环
            if (failedUrl.includes('/auth/refresh')) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              if (!window.location.pathname.includes('/login')) {
                const savedLang = localStorage.getItem('i18nextLng') || 'zh-CN';
                const i18nToUrl = { 'zh-CN': 'cn', en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr' };
                const urlLang = i18nToUrl[savedLang] || savedLang;
                window.location.href = '/' + urlLang + '/login';
              }
              return Promise.reject(apiError);
            }

            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('user');
              if (!window.location.pathname.includes('/login')) {
                const savedLang = localStorage.getItem('i18nextLng') || 'zh-CN';
                const i18nToUrl = { 'zh-CN': 'cn', en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr' };
                const urlLang = i18nToUrl[savedLang] || savedLang;
                window.location.href = '/' + urlLang + '/login';
              }
              return Promise.reject(apiError);
            }

            // 正在刷新中，将后续请求加入队列
            if (isRefreshing) {
              return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve: resolve, reject: reject });
              }).then(function(token) {
                if (originalRequest) {
                  originalRequest.headers.Authorization = 'Bearer ' + token;
                }
                return client(originalRequest);
              });
            }

            isRefreshing = true;

            // 尝试刷新 token
            return axios({
              method: 'POST',
              url: getApiBaseUrl() + '/auth/refresh',
              data: { refreshToken: refreshToken },
              headers: { 'Content-Type': 'application/json' }
            }).then(function(refreshResponse) {
              var data = refreshResponse.data;
              var newToken = (data && data.data && data.data.tokens && data.data.tokens.accessToken) || (data && data.accessToken);
              var newRefreshToken = (data && data.data && data.data.tokens && data.data.tokens.refreshToken) || (data && data.refreshToken);

              if (newToken) {
                localStorage.setItem('accessToken', newToken);
                if (newRefreshToken) {
                  localStorage.setItem('refreshToken', newRefreshToken);
                }
                processQueue(null, newToken);
                if (originalRequest) {
                  originalRequest.headers.Authorization = 'Bearer ' + newToken;
                }
                return client(originalRequest);
              }
              throw new Error('刷新Token失败：未获取到新令牌');
            }).catch(function(refreshError) {
              processQueue(refreshError, null);
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              if (!window.location.pathname.includes('/login')) {
                const savedLang = localStorage.getItem('i18nextLng') || 'zh-CN';
                const i18nToUrl = { 'zh-CN': 'cn', en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr' };
                const urlLang = i18nToUrl[savedLang] || savedLang;
                window.location.href = '/' + urlLang + '/login';
              }
              return Promise.reject(apiError);
            }).finally(function() {
              isRefreshing = false;
            });
          }"""

content = content[:start_idx] + new_block + content[end_idx:]

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
