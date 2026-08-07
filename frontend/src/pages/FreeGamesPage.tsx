import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Rate, Spin } from 'antd';
import { ThunderboltOutlined, TeamOutlined, TrophyOutlined, PlayCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { useGames } from '../api/hooks';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;

export default function FreeGamesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: games = [], isLoading } = useGames({ limit: 50 });
  const freeGames = (games || []).filter((g: any) => g.displayZone === 'free' || g.price === 0);
  const lang = window.location.pathname.split('/')[1] || 'cn';

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title="免费游戏 | GameHub" description="精选免费游戏推荐，无需付费即可畅玩" />
      <div className="py-8">
        <div className="mb-8">
          <Title level={1} className="!text-white !mb-2">免费游戏</Title>
          <Paragraph className="!text-gray-400">精选免费好游，不花钱也能畅玩</Paragraph>
        </div>

        {isLoading ? <div className="flex justify-center py-12"><Spin size="large" /></div> : (
          <Row gutter={[20, 20]}>
            {freeGames.map((game: any) => (
              <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  className="h-full bg-dark-800 border-dark-700"
                  cover={
                    <div className="h-40 overflow-hidden relative">
                      <img src={game.imageUrl || game.coverImageUrl} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
                      <Tag color="green" className="absolute top-2 left-2">免费</Tag>
                    </div>
                  }
                  onClick={() => navigate(`/${lang}/games/${game.id}`)}
                >
                  <Card.Meta
                    title={<span className="text-white text-sm">{game.title}</span>}
                    description={
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
                          <span className="text-xs text-gray-400">{Number(game.rating).toFixed(1)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(game.genres || []).slice(0, 3).map((g: string) => <Tag key={g} className="text-[10px]">{g}</Tag>)}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
