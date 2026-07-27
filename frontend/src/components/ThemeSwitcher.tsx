import { useState, useEffect } from 'react';
import { Dropdown } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';

const themes = [
  { key: 'dark', label: '深色', color: '#0f172a' },
  { key: 'light', label: '浅色', color: '#f1f5f9' },
];

const ThemeSwitcher = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app-theme') || 'dark';
    // 兼容旧主题：非 dark/light 的主题统一回退到 dark
    return (saved === 'dark' || saved === 'light') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('/api/v1/users/me/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme }),
      }).catch(() => {});
    }
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('/api/v1/users/me/theme', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => {
          if (d.success && d.data?.theme) {
            const t = d.data.theme;
            setTheme((t === 'dark' || t === 'light') ? t : 'dark');
          }
        }).catch(() => {});
    }
  }, []);

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
