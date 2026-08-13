import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Typography, Card, Row, Col } from 'antd';
import {
  CommentOutlined,
  BookOutlined,
  UserOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const aiCapabilities = [
  {
    key: 'chat',
    title: '心灵驿站',
    desc: '游戏心灵驿站，倾诉你的游戏故事，与 AI 畅聊游戏话题',
    icon: <CommentOutlined className="text-3xl" />,
    color: '#1677ff',
    gradient: 'from-blue-500 to-cyan-500',
    path: 'soul',
  },
  {
    key: 'guides',
    title: 'AI 攻略',
    desc: '搜索游戏攻略、评测、视频教程，一站式游戏知识库',
    icon: <BookOutlined className="text-3xl" />,
    color: '#52c41a',
    gradient: 'from-green-500 to-emerald-500',
    path: 'npc',
  },
  {
    key: 'companion',
    title: '命理师',
    desc: '完成性格测试，AI 为你推荐最匹配的游戏角色和玩法',
    icon: <ThunderboltOutlined className="text-3xl" />,
    color: '#fa8c16',
    gradient: 'from-orange-500 to-amber-500',
    path: 'companion',
  },
];

const AiAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const location = useLocation();

  // If there's a sub-route, render the Outlet (detail page)
  if (location.pathname.match(/\/ai\/(soul|npc|companion)/)) {
    return (
      <div className="bg-dark-900 py-6">
        <SEO title="AI 助手 | GameHub" description="GameHub AI 智能助手" keywords="AI助手, AI聊天, AI攻略, AI搜索, AI角色推荐" />
        <div className="px-8">
          <Outlet />
        </div>
      </div>
    );
  }

  // Hub page showing all capabilities
  return (
    <div className="bg-dark-900 py-2">
      <SEO title="AI 助手 | GameHub" description="GameHub AI 智能助手 — AI 聊天、攻略、搜索、角色推荐、人物自画像" keywords="AI助手, AI聊天, AI攻略, AI搜索, AI角色推荐" />

      <div className="px-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-6 shadow-lg shadow-purple-500/20">
            <RobotOutlined className="text-4xl text-white" />
          </div>
          <Title level={1} className="!text-white !text-3xl md:!text-4xl !mb-3">AI 助手</Title>
          <Paragraph className="text-gray-400 text-lg max-w-2xl mx-auto">
            GameHub AI 智能助手，为你提供游戏聊天陪伴、攻略搜索、智能问答、角色推荐、3D 形象定制等全方位 AI 能力
          </Paragraph>
        </div>

        {/* Capability Cards */}
        <Row gutter={[20, 20]}>
          {aiCapabilities.map((cap) => (
            <Col xs={24} sm={12} lg={8} key={cap.key}>
              <Card
                hoverable
                className="h-full bg-dark-800 border-dark-700 transition-all cursor-pointer hover:border-gray-500 hover:-translate-y-1"
                onClick={() => {
                  if (cap.path) {
                    navigate(`/${currentLang}/ai/${cap.path}`);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white">{cap.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white text-lg font-semibold">{cap.title}</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">{cap.desc}</p>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Quick Tips */}
        <div className="mt-10 p-6 bg-dark-800 rounded-xl border border-dark-700">
          <div className="flex items-center gap-2 mb-3">
            <BulbOutlined className="text-yellow-500 text-lg" />
            <span className="text-white font-semibold">使用提示</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div>💬 <strong className="text-gray-300">AI 聊天</strong>：选择游戏和心情，与 AI 畅聊游戏体验和情感</div>
            <div>📖 <strong className="text-gray-300">AI 攻略</strong>：搜索任意游戏名，获取攻略、视频和二创内容</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;
