# GameHub API 客户端代码示例

## 概述

本文档提供多语言客户端调用GameHub API的代码示例。所有示例均使用GameHub生产环境API端点。

**基础信息**
- API地址：`https://api.gamehub.example.com/api/v1`
- 认证方式：Bearer Token (JWT)
- 默认Content-Type：`application/json`

## JavaScript/TypeScript (Fetch API)

### 安装依赖
```bash
# 可选：安装axios（推荐）
npm install axios
```

### 基础客户端类
```javascript
class GameHubClient {
  constructor(baseURL = 'https://api.gamehub.example.com/api/v1', token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // 用户认证
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // 游戏相关
  async getGames(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/games${query ? `?${query}` : ''}`);
  }

  async getGameById(gameId) {
    return this.request(`/games/${gameId}`);
  }

  // 文件上传
  async uploadFile(file, type = 'single') {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(`/upload/${type}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });
  }

  // 收藏管理
  async addFavorite(gameId) {
    return this.request('/favorites', {
      method: 'POST',
      body: JSON.stringify({ gameId }),
    });
  }

  async getFavorites() {
    return this.request('/favorites');
  }
}

// 使用示例
async function example() {
  const client = new GameHubClient();

  try {
    // 注册用户
    const registerResponse = await client.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
    });

    // 登录获取令牌
    const loginResponse = await client.login({
      email: 'test@example.com',
      password: 'Password123!',
    });

    client.setToken(loginResponse.data.tokens.accessToken);

    // 获取游戏列表
    const games = await client.getGames({ limit: 10, page: 1 });
    console.log('游戏列表:', games);

    // 上传头像
    const fileInput = document.getElementById('avatar-input');
    const uploadResponse = await client.uploadFile(fileInput.files[0], 'image');
    console.log('上传结果:', uploadResponse);

  } catch (error) {
    console.error('API调用失败:', error);
  }
}
```

### Axios版本
```javascript
import axios from 'axios';

const gamehubAPI = axios.create({
  baseURL: 'https://api.gamehub.example.com/api/v1',
  timeout: 10000,
});

// 请求拦截器（添加Token）
gamehubAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gamehub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器（统一错误处理）
gamehubAPI.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，跳转到登录页
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// API函数
export const authAPI = {
  register: (userData) => gamehubAPI.post('/auth/register', userData),
  login: (credentials) => gamehubAPI.post('/auth/login', credentials),
  refreshToken: (refreshToken) => gamehubAPI.post('/auth/refresh', { refreshToken }),
  logout: () => gamehubAPI.post('/auth/logout'),
};

export const gameAPI = {
  getGames: (params) => gamehubAPI.get('/games', { params }),
  getGame: (id) => gamehubAPI.get(`/games/${id}`),
  searchGames: (query) => gamehubAPI.get('/games/search', { params: { q: query } }),
};

export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return gamehubAPI.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return gamehubAPI.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
```

## Python

### 使用requests库
```python
import requests
import json

class GameHubClient:
    def __init__(self, base_url='https://api.gamehub.example.com/api/v1', token=None):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        
        if token:
            self.session.headers.update({'Authorization': f'Bearer {token}'})
        
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def set_token(self, token):
        self.token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})
    
    def _request(self, method, endpoint, **kwargs):
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except:
                error_data = {'message': str(e)}
            
            print(f"API请求失败: {error_data.get('message', 'Unknown error')}")
            raise
    
    # 用户认证
    def register(self, username, email, password):
        data = {
            'username': username,
            'email': email,
            'password': password
        }
        return self._request('POST', '/auth/register', json=data)
    
    def login(self, email, password):
        data = {
            'email': email,
            'password': password
        }
        return self._request('POST', '/auth/login', json=data)
    
    # 游戏相关
    def get_games(self, page=1, limit=20, **filters):
        params = {'page': page, 'limit': limit, **filters}
        return self._request('GET', '/games', params=params)
    
    def get_game(self, game_id):
        return self._request('GET', f'/games/{game_id}')
    
    # 文件上传
    def upload_file(self, file_path, upload_type='single'):
        with open(file_path, 'rb') as f:
            files = {'file': f}
            # 临时移除JSON头，使用multipart/form-data
            headers = {k: v for k, v in self.session.headers.items() 
                      if k.lower() != 'content-type'}
            
            response = self.session.post(
                f"{self.base_url}/upload/{upload_type}",
                files=files,
                headers=headers
            )
            response.raise_for_status()
            return response.json()

# 使用示例
if __name__ == '__main__':
    client = GameHubClient()
    
    try:
        # 注册
        register_result = client.register('pythonuser', 'python@example.com', 'Password123!')
        print(f"注册成功: {register_result['message']}")
        
        # 登录
        login_result = client.login('python@example.com', 'Password123!')
        token = login_result['data']['tokens']['accessToken']
        client.set_token(token)
        print(f"登录成功，Token已设置")
        
        # 获取游戏
        games = client.get_games(limit=5)
        print(f"获取到 {len(games['data'])} 个游戏")
        
        # 上传文件
        upload_result = client.upload_file('avatar.png', 'image')
        print(f"文件上传成功: {upload_result['data']['file']['url']}")
        
    except Exception as e:
        print(f"操作失败: {e}")
```

## Java

### 使用OkHttp
```java
import okhttp3.*;
import org.json.JSONObject;
import java.io.IOException;

public class GameHubClient {
    private final String baseUrl;
    private String token;
    private final OkHttpClient client;
    
    public GameHubClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.client = new OkHttpClient.Builder()
                .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .build();
    }
    
    public void setToken(String token) {
        this.token = token;
    }
    
    private JSONObject request(String method, String endpoint, JSONObject body) throws IOException {
        String url = baseUrl + endpoint;
        
        Request.Builder requestBuilder = new Request.Builder()
                .url(url);
        
        // 添加认证头
        if (token != null) {
            requestBuilder.addHeader("Authorization", "Bearer " + token);
        }
        
        // 设置请求体和内容类型
        if (body != null) {
            RequestBody requestBody = RequestBody.create(
                body.toString(),
                MediaType.parse("application/json; charset=utf-8")
            );
            requestBuilder.method(method, requestBody);
        } else {
            if (!method.equals("GET")) {
                requestBuilder.method(method, RequestBody.create("", null));
            }
        }
        
        // 发送请求
        try (Response response = client.newCall(requestBuilder.build()).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected code " + response + ": " + response.body().string());
            }
            
            String responseBody = response.body().string();
            return new JSONObject(responseBody);
        }
    }
    
    // 用户认证
    public JSONObject register(String username, String email, String password) throws IOException {
        JSONObject body = new JSONObject();
        body.put("username", username);
        body.put("email", email);
        body.put("password", password);
        
        return request("POST", "/auth/register", body);
    }
    
    public JSONObject login(String email, String password) throws IOException {
        JSONObject body = new JSONObject();
        body.put("email", email);
        body.put("password", password);
        
        return request("POST", "/auth/login", body);
    }
    
    // 游戏相关
    public JSONObject getGames(int page, int limit) throws IOException {
        String endpoint = String.format("/games?page=%d&limit=%d", page, limit);
        return request("GET", endpoint, null);
    }
    
    public JSONObject getGame(String gameId) throws IOException {
        return request("GET", "/games/" + gameId, null);
    }
    
    // 文件上传（使用Multipart）
    public JSONObject uploadFile(String filePath, String uploadType) throws IOException {
        String url = baseUrl + "/upload/" + uploadType;
        
        java.io.File file = new java.io.File(filePath);
        RequestBody fileBody = RequestBody.create(file, MediaType.parse("application/octet-stream"));
        
        MultipartBody.Builder builder = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.getName(), fileBody);
        
        MultipartBody requestBody = builder.build();
        
        Request.Builder requestBuilder = new Request.Builder()
                .url(url)
                .post(requestBody);
        
        if (token != null) {
            requestBuilder.addHeader("Authorization", "Bearer " + token);
        }
        
        try (Response response = client.newCall(requestBuilder.build()).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Upload failed: " + response);
            }
            
            String responseBody = response.body().string();
            return new JSONObject(responseBody);
        }
    }
    
    public static void main(String[] args) {
        GameHubClient client = new GameHubClient("https://api.gamehub.example.com/api/v1");
        
        try {
            // 注册
            JSONObject registerResult = client.register("javauser", "java@example.com", "Password123!");
            System.out.println("注册成功: " + registerResult.getString("message"));
            
            // 登录
            JSONObject loginResult = client.login("java@example.com", "Password123!");
            String token = loginResult.getJSONObject("data")
                                    .getJSONObject("tokens")
                                    .getString("accessToken");
            client.setToken(token);
            System.out.println("登录成功，Token已设置");
            
            // 获取游戏
            JSONObject games = client.getGames(1, 10);
            System.out.println("获取游戏成功，数量: " + 
                games.getJSONObject("data").getJSONArray("games").length());
            
        } catch (Exception e) {
            System.err.println("操作失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
```

## cURL 示例

### 用户注册
```bash
curl -X POST "https://api.gamehub.example.com/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### 用户登录
```bash
curl -X POST "https://api.gamehub.example.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### 获取游戏列表（带分页）
```bash
curl -X GET "https://api.gamehub.example.com/api/v1/games?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 文件上传
```bash
curl -X POST "https://api.gamehub.example.com/api/v1/upload/image" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/avatar.png"
```

### 发送验证邮件
```bash
curl -X POST "https://api.gamehub.example.com/api/v1/email/verification" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "verificationLink": "https://gamehub.example.com/verify?token=abc123",
    "userName": "张三"
  }'
```

## React Hook 示例

```javascript
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://api.gamehub.example.com/api/v1',
});

// 添加请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 添加响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期处理
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// 自定义Hook：游戏数据
export function useGames(page = 1, limit = 20) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const response = await api.get('/games', {
          params: { page, limit }
        });
        
        setGames(response.data.games || []);
        setPagination(response.meta || {});
        setError(null);
      } catch (err) {
        setError(err.message || '获取游戏失败');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [page, limit]);

  return { games, loading, error, pagination };
}

// 自定义Hook：文件上传
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file, type = 'image') => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const response = await api.post(`/upload/${type}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      return response.data;
    } catch (err) {
      setError(err.message || '上传失败');
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, progress, error };
}

// 组件中使用
function GameList() {
  const { games, loading, error } = useGames(1, 10);
  const { upload, uploading, progress } = useFileUpload();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await upload(file, 'image');
      console.log('上传成功:', result);
      // 更新用户头像等
    } catch (err) {
      console.error('上传失败:', err);
    }
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h1>游戏列表</h1>
      <input type="file" onChange={handleFileUpload} />
      {uploading && <div>上传进度: {progress}%</div>}
      
      <ul>
        {games.map(game => (
          <li key={game.id}>{game.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## 常见问题

### 1. 认证失败
- 检查Token是否过期（默认7天）
- 使用刷新令牌获取新的访问令牌
- 确保请求头格式正确：`Authorization: Bearer YOUR_TOKEN`

### 2. 文件上传失败
- 检查文件大小（最大20MB）
- 检查文件类型（支持图片、文档、压缩包）
- 确保使用multipart/form-data格式
- 认证用户才能上传文件

### 3. 速率限制
- 默认限制：100请求/15分钟/IP
- 超出限制返回429状态码
- 建议客户端实现请求队列和重试机制

### 4. 错误处理
所有错误响应遵循统一格式：
```json
{
  "success": false,
  "error": "错误描述",
  "message": "用户友好消息",
  "details": {} // 可选，详细错误信息
}
```

### 5. 分页参数
- `page`: 页码（从1开始）
- `limit`: 每页数量（默认20，最大100）
- `sortBy`: 排序字段
- `sortOrder`: 排序方向（asc/desc）

---

*文档版本：1.0.0*  
*最后更新：2026-04-21*  
*适用API版本：v1*