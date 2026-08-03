import React, { useState } from 'react';
import { Card, List, Tag, Select, Spin, Empty, Rate, Typography } from 'antd';
import { FireOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTrendingContent } from '../api/hooks';
import SEO from '../components/SEO';

const { Title } = Typography;

const TrendingPage: React.FC = () => {
  const navigate = useNavigate();
  const [limit] = useState<number>(20);
  const { data: trending, isLoading } = useTrendingContent(limit);

  const lang = window.location.pathname.split('/')[1] || 'cn';
  const handleClick = (item: any) => {
    if (item.type === 'game') navigate(`/${lang}/games/${item.id}`);
    else if (item.type === 'review') navigate(`/${lang}/reviews/${item.id}`);
    else if (item.type === 'news') navigate(`/${lang}/news/${item.id}`);
  };

  return (
    <div className=" py-8">
      <SEO
        title="热门趋势 | GameHub"
        description="GameHub 热门内容 - 发现最受欢迎的游戏和内容"
        keywords="热门游戏,趋势,最受欢迎,GameHub"
      />

      <Title level={1} className="mb-6 flex items-center !text-white">
        <FireOutlined className="mr-3 text-red-500" />
        热门趋势
      </Title>

      <Card className="shadow-sm bg-dark-800 border-dark-700">
        {isLoading ? (
          <div className="py-20 text-center"><Spin size="large" /></div>
        ) : trending?.length ? (
          <List
            dataSource={trending}
            renderItem={(item, index) => (
              <List.Item
                className="cursor-pointer hover:bg-dark-700 rounded-lg px-4"
                onClick={() => handleClick(item)}
                extra={
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{item.rating || '-'}</div>
                      <div className="text-xs text-gray-400">评分</div>
                    </div>
                    <RightOutlined className="text-gray-300" />
                  </div>
                }
              >
                <div className="flex items-center space-x-4 w-full">
                  {/* 排名 */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${index === 0 ? 'bg-red-500 text-white' :
                      index === 1 ? 'bg-orange-400 text-white' :
                      index === 2 ? 'bg-amber-400 text-white' :
                      'bg-dark-700 text-gray-300'}`}
                  >
                    #{index + 1}
                  </div>

                  {/* 封面 */}
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex-shrink-0 overflow-hidden">
                    {item.coverImageUrl ? (
                      <img src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.style.display = 'none'; el.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'text-2xl', 'opacity-40'); el.parentElement!.textContent = '🎮'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">🎮</div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold truncate text-white">{item.title}</h4>
                      <Tag color="red" className="flex-shrink-0 text-xs">HOT</Tag>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-400">{item.reason}</span>
                      {item.likes && <span className="text-xs text-gray-400">· {item.likes} 热度</span>}
                    </div>
                    {item.rating && (
                      <div className="mt-1">
                        <Rate disabled value={Number(item.rating) / 2} allowHalf className="text-xs" />
                      </div>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无热门内容" className="py-20" />
        )}
      </Card>
    </div>
  );
};

export default TrendingPage;
