import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Tag, Typography, Rate, Spin, Input } from 'antd';
import { HeartOutlined, StarFilled, SmileOutlined, SearchOutlined } from '@ant-design/icons';
import { useGames } from '../api/hooks';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;

export default function CozyGamesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: games = [], isLoading } = useGames({ limit: 50 });
  const lang = window.location.pathname.split('/')[1] || 'cn';
  const cozyGames = useMemo(() => {
    let list = (games || []).filter((g: any) => g.displayZone === 'cozy' || (g.genres || []).some((ge: string) => ['休闲', '治愈', '模拟', '可爱'].includes(ge)));
    if (search) list = list.filter((g: any) => g.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [games, search]);

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title="治愈游戏 | GameHub" description="温暖治愈的游戏推荐" />

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-pink-800 via-rose-900 to-purple-900 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <HeartOutlined className="text-6xl text-pink-400 mb-4" />
          <Title level={1} className="!text-white !mb-3 !text-4xl">治愈游戏</Title>
          <Paragraph className="!text-pink-200 !text-lg !mb-6 max-w-2xl mx-auto">
            放下疲惫，沉浸在温暖的游戏世界里。种田、养宠、探索、交友，让心灵得到治愈。
          </Paragraph>
          <Input size="large" placeholder="搜索治愈游戏..." prefix={<SearchOutlined />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear
            className="max-w-md mx-auto !bg-white/10 !border-pink-400/30 !text-white placeholder:!text-pink-300" />
          <Text className="!text-pink-300 block mt-3">{cozyGames.length} 款治愈游戏等你来发现</Text>
        </div>
      </div>

      <div className="py-10 max-w-7xl mx-auto px-4">
        {isLoading ? <div className="flex justify-center py-20"><Spin size="large" /></div> : (
          <>
            {/* Top 6 Featured */}
            {cozyGames.length > 0 && (
              <section className="mb-14">
                <div className="flex items-center justify-between mb-6">
                  <Title level={2} className="!text-white !mb-0 !text-2xl">
                    <StarFilled className="mr-2 text-pink-400" />精选推荐
                  </Title>
                </div>
                <Row gutter={[24, 24]}>
                  {cozyGames.slice(0, 6).map((game: any, idx: number) => (
                    <Col key={game.id} xs={24} sm={12} lg={8}>
                      <div
                        className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-500/10"
                        onClick={() => navigate(`/${lang}/games/${game.id}`)}
                      >
                        <div className="h-48 overflow-hidden relative">
                          <img src={game.imageUrl || game.coverImageUrl} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          <div className="absolute top-3 left-3 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            <SmileOutlined className="mr-1" />治愈
                          </div>
                          {idx < 3 && <div className="absolute top-3 right-3 bg-rose-400 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">TOP{idx+1}</div>}
                        </div>
                        <div className="p-4">
                          <Title level={4} className="!text-white !mb-1 !text-base truncate">{game.title}</Title>
                          <div className="flex items-center gap-2 mb-2">
                            <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
                            <span className="text-xs text-gray-400">{Number(game.rating).toFixed(1)}</span>
                          </div>
                          <Paragraph className="!text-gray-500 !text-xs line-clamp-2 !mb-2">{game.description}</Paragraph>
                          <div className="flex flex-wrap gap-1">
                            {(game.genres || []).slice(0, 3).map((g: string) => <Tag key={g} className="text-[10px] bg-dark-700 border-0 text-gray-300">{g}</Tag>)}
                          </div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </section>
            )}

            {/* All Cozy Games Grid */}
            <section>
              <Title level={2} className="!text-white !mb-6 !text-2xl">全部治愈游戏</Title>
              <Row gutter={[16, 16]}>
                {cozyGames.map((game: any) => (
                  <Col key={game.id} xs={12} sm={8} md={6} lg={4}>
                    <div
                      className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden cursor-pointer group hover:border-pink-500/50 transition-all duration-300 hover:-translate-y-1"
                      onClick={() => navigate(`/${lang}/games/${game.id}`)}
                    >
                      <div className="h-32 overflow-hidden">
                        <img src={game.imageUrl || game.coverImageUrl} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                      <div className="p-3">
                        <div className="text-white text-sm font-medium truncate mb-1">{game.title}</div>
                        <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
