import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Input, Tag, Card, Rate, Pagination } from 'antd';
import { SearchOutlined, PlayCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

/** 游戏分类过滤键（显示文案见 games.json 的 onlineGames.categories.*） */
const categories = ['all', 'casual', 'puzzle', 'action', 'strategy'];

/** 在线小游戏元数据（可翻译字段 name/description 见 games.json 的 onlineGames.games.*） */
const onlineGames = [
  { id: 'snake', icon: '🐍', color: 'from-green-500 to-emerald-600', players: 2341, rating: 4.5, category: 'casual' },
  { id: 'tetris', icon: '🧱', color: 'from-blue-500 to-cyan-600', players: 3892, rating: 4.8, category: 'puzzle' },
  { id: 'brick-breaker', icon: '🧱', color: 'from-orange-500 to-red-600', players: 1876, rating: 4.3, category: 'action' },
  { id: 'gobang', icon: '⚫', color: 'from-purple-500 to-indigo-600', players: 4567, rating: 4.7, category: 'strategy' },
  { id: 'minesweeper', icon: '💣', color: 'from-gray-600 to-gray-800', players: 2987, rating: 4.4, category: 'puzzle' },
  { id: 'game2048', icon: '🔢', color: 'from-amber-500 to-yellow-600', players: 5432, rating: 4.9, category: 'puzzle' },
  { id: 'memory', icon: '🃏', color: 'from-pink-500 to-rose-600', players: 1567, rating: 4.2, category: 'casual' },
  { id: 'pong', icon: '🏓', color: 'from-teal-500 to-green-600', players: 3210, rating: 4.6, category: 'action' },
  { id: 'tank-battle', icon: '🎮', color: 'from-green-700 to-yellow-600', players: 1876, rating: 4.7, category: 'action' },
  { id: 'magic-trampoline', icon: '☀️', color: 'from-pink-500 to-purple-600', players: 1234, rating: 4.5, category: 'casual' },
  { id: 'space-shooter', icon: '✈️', color: 'from-cyan-500 to-blue-700', players: 3456, rating: 4.8, category: 'action' },
  { id: 'whack-a-mole', icon: '🔨', color: 'from-yellow-700 to-green-700', players: 2345, rating: 4.4, category: 'casual' },
  { id: 'match-three', icon: '💎', color: 'from-red-500 to-orange-500', players: 4567, rating: 4.9, category: 'puzzle' },
  { id: 'speed-racer', icon: '🏎️', color: 'from-red-600 to-orange-600', players: 2876, rating: 4.6, category: 'action' },
  { id: 'bubble-shooter', icon: '🫧', color: 'from-blue-400 to-purple-500', players: 1987, rating: 4.5, category: 'puzzle' },
  { id: 'sliding-puzzle', icon: '🔢', color: 'from-blue-600 to-indigo-600', players: 1654, rating: 4.3, category: 'puzzle' },
  { id: 'jump-adventure', icon: '🦘', color: 'from-teal-400 to-green-500', players: 3120, rating: 4.7, category: 'action' },
  { id: 'archery-master', icon: '🏹', color: 'from-amber-600 to-yellow-500', players: 1432, rating: 4.4, category: 'casual' },
  { id: 'guandan', icon: '🃏', color: 'from-red-600 to-orange-500', players: 5680, rating: 4.8, category: 'strategy' },
];

const OnlineGamesPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { t } = useTranslation('games');
  const currentLang = lang || 'cn';
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';

  // Online games 结构化数据（面包屑 / ItemList / FAQ）
  const structuredData = [
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': t('onlineGames.breadcrumbHome'), 'item': 'https://www.gghubs.com' },
        { '@type': 'ListItem', 'position': 2, 'name': t('onlineGames.title'), 'item': `${siteUrl}/${currentLang}/library/online` },
      ],
    },
    {
      '@type': 'ItemList',
      'name': t('onlineGames.itemListName'),
      'description': t('onlineGames.itemListDescription'),
      'itemListElement': onlineGames.map((game, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
          '@type': 'VideoGame',
          'name': t(`onlineGames.games.${game.id}.name`),
          'description': t(`onlineGames.games.${game.id}.description`),
          'genre': t(`onlineGames.categories.${game.category}`),
          'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
          'url': `${siteUrl}/${currentLang}/library/play/${game.id}`,
        },
      })),
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [1, 2, 3, 4].map((i) => ({
        '@type': 'Question',
        'name': t(`onlineGames.faq.q${i}`),
        'acceptedAnswer': { '@type': 'Answer', 'text': t(`onlineGames.faq.a${i}`) },
      })),
    },
  ];

  const filteredGames = useMemo(() => {
    let result = [...onlineGames];
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(g => {
        const name = t(`onlineGames.games.${g.id}.name`).toLowerCase();
        const desc = t(`onlineGames.games.${g.id}.description`).toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }
    if (selectedCategory !== 'all') {
      result = result.filter(g => g.category === selectedCategory);
    }
    return result;
  }, [searchText, selectedCategory, t]);

  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGames.slice(start, start + pageSize);
  }, [filteredGames, currentPage]);

  return (
    <div className="bg-dark-900">
      <SEO
        title={t('onlineGames.seoTitle')}
        description={t('onlineGames.seoDescription')}
        keywords={t('onlineGames.seoKeywords')}
        structuredData={structuredData}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2">
        <div className="">
          <div className="text-center">
            <Title level={1} className="!text-white mb-4">{t('onlineGames.title')}</Title>
            <Paragraph className="!text-indigo-100 !text-lg mb-8">{t('onlineGames.subtitle')}</Paragraph>
            <div className="max-w-xl mx-auto">
              <Input
                size="large"
                placeholder={t('onlineGames.searchPlaceholder')}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="py-2">
        {/* Category */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <Tag
              key={cat}
              className={`
                cursor-pointer px-4 py-1.5 rounded-full text-sm border-0 m-0
                ${selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'}
              `}
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
            >
              {t(`onlineGames.categories.${cat}`)}
            </Tag>
          ))}
        </div>

        {/* Game Grid */}
        {paginatedGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedGames.map(game => (
              <Card
                key={game.id}
                hoverable
                className="bg-dark-800 border-dark-700 overflow-hidden group"
                onClick={() => navigate(`/${lang || 'cn'}/library/play/${game.id}`)}
              >
                {/* Icon Area */}
                <div className={`h-40 bg-gradient-to-br ${game.color} flex items-center justify-center -mx-6 -mt-6 mb-4 relative overflow-hidden`}>
                  <span className="text-6xl transition-transform duration-300 group-hover:scale-110">{game.icon}</span>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <PlayCircleOutlined className="text-4xl text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                </div>

                <div className="mb-2">
                  <Tag color="default" className="bg-dark-700 text-gray-300 border-0">{t(`onlineGames.categories.${game.category}`)}</Tag>
                </div>

                <Title level={3} className="!text-white !text-base !mb-1">{t(`onlineGames.games.${game.id}.name`)}</Title>
                <Paragraph className="!text-gray-400 !text-sm !mb-3 line-clamp-2">{t(`onlineGames.games.${game.id}.description`)}</Paragraph>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <UserOutlined />
                    <span>{game.players.toLocaleString()}</span>
                  </div>
                  <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 opacity-30">🎮</div>
            <Title level={3} className="!text-gray-400">{t('onlineGames.noResults')}</Title>
            <Paragraph className="!text-gray-500">{t('onlineGames.noResultsHint')}</Paragraph>
          </div>
        )}

        {/* Pagination */}
        {filteredGames.length > pageSize && (
          <div className="flex justify-center mt-8">
            <Pagination
              current={currentPage}
              total={filteredGames.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              className="[&_.ant-pagination-item]:!bg-dark-700 [&_.ant-pagination-item]:!border-dark-600 [&_.ant-pagination-item-active]:!border-indigo-500 [&_.ant-pagination-item-active]:!bg-indigo-600"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineGamesPage;
