import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Rate, Spin } from 'antd';
import { PlayCircleOutlined, ThunderboltOutlined, TeamOutlined, TrophyOutlined } from '@ant-design/icons';
import { useGames } from '../api/hooks';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

export default function FreeGamesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: games = [], isLoading } = useGames({ limit: 50 });
  const freeGames = (games || []).filter((g: any) => g.displayZone === 'free' || g.price === 0);
  const lang = window.location.pathname.split('/')[1] || 'cn';

  const icons = [<ThunderboltOutlined className="text-3xl text-red-400" />, <TrophyOutlined className="text-3xl text-yellow-400" />, <TeamOutlined className="text-3xl text-green-400" />, <PlayCircleOutlined className="text-3xl text-sky-400" />];

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title="免费游戏 | GameHub" description="精选免费游戏推荐" />
      <div className="py-8">
        <Title level={1} className="!text-white !mb-2">免费游戏</Title>
        <Paragraph className="!text-gray-400 mb-8">精选免费好游，不花钱也能畅玩</Paragraph>

        {isLoading ? <div className="flex justify-center py-12"><Spin size="large" /></div> : (
          <>
            {freeGames.length > 0 && (
              <section className="mb-12">
                <Title level={2} className="!text-white !text-2xl !mb-6">热门免费游戏</Title>
                <Row gutter={[20, 20]}>
                  {freeGames.slice(0, 6).map((game: any) => (
                    <Col key={game.id} xs={24} sm={12} md={8} lg={8}>
                      <Card hoverable className="bg-dark-800 border-dark-700 h-full"
                        cover={<img src={game.imageUrl || game.coverImageUrl} alt={game.title} className="h-40 object-cover" />}
                        onClick={() => navigate(`/${lang}/games/${game.id}`)}>
                        <Card.Meta title={<span className="text-white">{game.title}</span>}
                          description={<div>
                            <Rate disabled value={game.rating/2} allowHalf className="text-xs" />
                            <div className="flex flex-wrap gap-1 mt-1">{(game.genres||[]).slice(0,3).map((g:string)=><Tag key={g} className="text-[10px]">{g}</Tag>)}</div>
                          </div>}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </section>
            )}

            <section className="mb-12">
              <Title level={2} className="!text-white !text-2xl !mb-6">全部免费游戏</Title>
              <Row gutter={[16, 16]}>
                {freeGames.map((game: any, idx: number) => (
                  <Col key={game.id} xs={12} sm={8} md={6} lg={4}>
                    <Card hoverable className="bg-dark-800 border-dark-700 text-center"
                      cover={<img src={game.imageUrl || game.coverImageUrl} alt={game.title} className="h-32 object-cover" />}
                      onClick={() => navigate(`/${lang}/games/${game.id}`)}>
                      <div className="text-white text-sm font-medium truncate">{game.title}</div>
                      <Rate disabled value={game.rating/2} allowHalf className="text-xs" />
                    </Card>
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
