import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Rate, Spin, Input } from 'antd';
import { ThunderboltOutlined, RightOutlined, FireOutlined, CrownOutlined, SearchOutlined } from '@ant-design/icons';
import { useGames } from '../api/hooks';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;

export default function FreeGamesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: games = [], isLoading } = useGames({ limit: 50 });
  const lang = window.location.pathname.split('/')[1] || 'cn';
  const freeGames = useMemo(() => {
    let list = (games || []).filter((g: any) => g.displayZone === 'free' || g.price === 0);
    if (search) list = list.filter((g: any) => g.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [games, search]);

  return (
    <div className="bg-dark-900">
      <SEO title="免费游戏 | GameHub" description="精选免费游戏推荐" />

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-cyan-900 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <ThunderboltOutlined className="text-6xl text-emerald-400 mb-4" />
          <Title level={1} className="!text-white !mb-3 !text-4xl">免费游戏</Title>
          <Paragraph className="!text-emerald-200 !text-lg !mb-6 max-w-2xl mx-auto">
            精选免费好游，无需付费即可畅玩。从MOBA到FPS，从卡牌到开放世界，总有一款适合你。
          </Paragraph>
          <Input size="large" placeholder="搜索免费游戏..." prefix={<SearchOutlined />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear
            className="max-w-md mx-auto !bg-white/10 !border-emerald-400/30 !text-white placeholder:!text-emerald-300" />
          <Text className="!text-emerald-300 block mt-3">{freeGames.length} 款免费游戏等你来玩</Text>
        </div>
      </div>

      <div className="py-2 max-w-7xl mx-auto px-4">
        {isLoading ? <div className="flex justify-center py-20"><Spin size="large" /></div> : (
          <>
            {/* Top 6 Featured */}
            {freeGames.length > 0 && (
              <section className="mb-14">
                <div className="flex items-center justify-between mb-6">
                  <Title level={2} className="!text-white !mb-0 !text-2xl">
                    <CrownOutlined className="mr-2 text-yellow-400" />热门推荐
                  </Title>
                </div>
                <Row gutter={[24, 24]}>
                  {freeGames.slice(0, 6).map((game: any, idx: number) => (
                    <Col key={game.id} xs={24} sm={12} lg={8}>
                      <Card
                        hoverable
                        className="h-full bg-dark-800 border-dark-700 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10"
                        cover={
                          <div className="h-48 overflow-hidden relative">
                            <img src={game.imageUrl || game.coverImageUrl} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                              <FireOutlined /> 免费
                            </div>
                            {idx < 3 && <div className="absolute top-3 right-3 bg-yellow-500 text-black text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">TOP{idx+1}</div>}
                          </div>
                        }
                        onClick={() => navigate(`/${lang}/games/${game.id}`)}
                      >
                        <div className="mb-3">
                          <Title level={4} className="!text-white !mb-1 !text-base truncate">{game.title}</Title>
                          <div className="flex items-center gap-2">
                            <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
                            <span className="text-xs text-gray-400">{Number(game.rating).toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(game.genres || []).slice(0, 3).map((g: string) => <Tag key={g} className="text-[10px] bg-dark-700 border-0 text-gray-300">{g}</Tag>)}
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </section>
            )}

            {/* All Free Games Grid */}
            <section>
              <Title level={2} className="!text-white !mb-6 !text-2xl">全部免费游戏</Title>
              <Row gutter={[16, 16]}>
                {freeGames.map((game: any) => (
                  <Col key={game.id} xs={12} sm={8} md={6} lg={4}>
                    <div
                      className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden cursor-pointer group hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1"
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
