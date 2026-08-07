import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Rate, Spin } from 'antd';
import { HeartOutlined, SmileOutlined, CoffeeOutlined, StarOutlined } from '@ant-design/icons';
import { useGames } from '../api/hooks';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

export default function CozyGamesPage() {
  const navigate = useNavigate();
  const { data: games = [], isLoading } = useGames({ limit: 50 });
  const cozyGames = (games || []).filter((g: any) => g.displayZone === 'cozy' || (g.genres || []).some((ge: string) => ['休闲', '治愈', '模拟', '可爱'].includes(ge)));
  const lang = window.location.pathname.split('/')[1] || 'cn';

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title="治愈游戏 | GameHub" description="温暖治愈的游戏推荐" />
      <div className="py-8">
        <Title level={1} className="!text-white !mb-2">
          <HeartOutlined className="mr-3 text-pink-400" />治愈游戏
        </Title>
        <Paragraph className="!text-gray-400 mb-8">放松心情，享受温暖的游戏时光</Paragraph>

        {isLoading ? <div className="flex justify-center py-12"><Spin size="large" /></div> : (
          <>
            {cozyGames.length > 0 && (
              <section className="mb-12">
                <Title level={2} className="!text-white !text-2xl !mb-6">推荐治愈游戏</Title>
                <Row gutter={[20, 20]}>
                  {cozyGames.slice(0, 6).map((game: any) => (
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
            <Row gutter={[16, 16]}>
              {cozyGames.map((game: any) => (
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
          </>
        )}
      </div>
    </div>
  );
}
