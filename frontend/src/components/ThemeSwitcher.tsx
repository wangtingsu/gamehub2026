import { useState, useEffect, useRef } from 'react';
import { Dropdown } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';

const themes = [
  { key: 'dark', label: '深色', color: '#0f172a' },
  { key: 'light', label: '浅色', color: '#f1f5f9' },
];

const normalize = (t: string) => (t === 'dark' || t === 'light') ? t : 'dark';

const ThemeSwitcher = () => {
  const [theme, setTheme] = useState(() => normalize(localStorage.getItem('app-theme') || 'dark'));
  const mounted = useRef(false);

  // 挂载时：仅当本地没有保存过主题时，才从服务端拉取作为初始值。
  // 本地已有选择时以 localStorage 为准，避免服务端旧值把用户选择覆盖回去。
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || localStorage.getItem('app-theme')) return;
    fetch('/api/v1/users/me/theme', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.success && d.data?.theme) setTheme(normalize(d.data.theme));
      }).catch(() => {});
  }, []);

  // 主题变化：应用到 DOM、持久化本地；用户主动切换时才同步到服务端
  // （首次挂载不同步，避免用默认值覆盖服务端已保存的偏好）
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
    if (!mounted.current) { mounted.current = true; return; }
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('/api/v1/users/me/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme }),
      }).catch(() => {});
    }
  }, [theme]);

  return (
    <Dropdown menu={{ items: themes.map(t => ({
      key: t.key,
      label: <span>{t.label} <span style={{ display:'inline-block',width:12,height:12,borderRadius:3,backgroundColor:t.color,marginLeft:8,verticalAlign:'middle'}} /></span>,
      onClick: () => setTheme(t.key),
    })) }} trigger={['click']}>
      <span className="cursor-pointer text-gray-400 hover:text-white px-2">
        <BgColorsOutlined />
      </span>
    </Dropdown>
  );
};

export default ThemeSwitcher;
