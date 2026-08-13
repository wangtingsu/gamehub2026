/**
 * HomePage - GameHub 首页
 *
 * 精选内容着陆页，聚合展示平台核心内容：
 * - Hero 滚动横幅（后台可配置）
 * - 精选文章（攻略/评测/新闻，按热度+时间排序）
 * - 热门讨论（社区热帖，按回复数+热度排序）
 * - 兑换码专区（限时优惠码）
 * - 热门游戏推荐（社区热门游戏排行）
 * - 社区宣传 CTA
 *
 * 支持 SEO 结构化数据、滚动触发动画、懒加载图片。
 */
import { Row, Col, Button, Typography } from 'antd';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import HeroBanner from '../components/home/HeroBanner';
import FeaturedArticles from '../components/home/FeaturedArticles';
import HotDiscussions from '../components/home/HotDiscussions';
import RedeemCodeSection from '../components/home/RedeemCodeSection';
import HotGameRecommendations from '../components/home/HotGameRecommendations';

const { Title, Paragraph } = Typography;

const HomePage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { t } = useTranslation('home');

  return (
    <div className="home-page bg-dark-900 pt-6">
      {/* SEO 配置 */}
      <SEO
        title={i18n.language?.startsWith("en") ? "GameHub - Game Reviews & Recommendations | Find Your Next Favorite Game" : "GameHub - 专业游戏推荐与评测平台 | 发现你的下一款最爱游戏"}
        description={i18n.language?.startsWith("en") ? "GameHub is a professional game recommendation and review community platform. Discover game reviews, trending recommendations, in-depth guides, and join gaming discussions." : "GameHub（好游聚）是专业的游戏推荐与评测社区平台，提供最新游戏评测、热门游戏推荐、深度游戏攻略和玩家社区讨论。"}
        keywords={i18n.language?.startsWith("en") ? "game reviews, game recommendations, gaming community, game guides, GameHub, PC games" : "游戏推荐, 游戏评测, 游戏攻略, 游戏社区, GameHub, 好游聚, PC游戏"}
        structuredData={[
          {
            '@type': 'FAQPage',
            'mainEntity': [
              {
                '@type': 'Question',
                'name': i18n.language?.startsWith('en') ? 'What is GameHub?' : 'GameHub（好游聚）是什么？',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text': i18n.language?.startsWith('en')
                    ? 'GGHubs is a comprehensive gaming community platform for discovering game reviews, recommendations, guides, and connecting with millions of gamers worldwide. It features AI-powered game recommendations, real-time gaming news, community forums, and playable HTML5 games.'
                    : 'GGHubs（好游聚）是一个综合性游戏社区平台，提供游戏评测、游戏推荐、游戏攻略、玩家社区讨论等功能。平台特色包括AI智能游戏推荐、实时游戏资讯、互动论坛以及在线小游戏。',
                },
              },
            ],
          },
        ]}
      />
      {/* 页面主标题（仅 SEO 可见） */}
      <h1 className="sr-only">{i18n.language?.startsWith("en") ? "GameHub - Game Reviews & Recommendations, Find Your Next Favorite Game" : "GameHub - 发现游戏推荐与游戏评测，找到你的下一款最爱游戏"}</h1>
      <SEOBreadcrumb items={[{ name: "Home", url: "/" }]} />

      {/* SEO 平台介绍（仅搜索引擎可见） */}
      <section className="sr-only" aria-label={i18n.language?.startsWith("en") ? "Platform Introduction" : "平台介绍"}>
        {i18n.language?.startsWith("en") ? (
          <>
            <p>GGHubs is a comprehensive gaming community platform focused on game recommendations and reviews.</p>
            <p>Our recommendation system uses smart algorithms and community feedback to personalize game suggestions.</p>
            <p>Features include: personalized recommendations, multi-dimensional reviews, real-time news, community forums, achievements, and AI assistant.</p>
          </>
        ) : (
          <>
            <p>GGHubs（好游聚）是一个专注于游戏推荐与游戏评测的综合性游戏社区平台。</p>
            <p>我们的游戏推荐系统基于智能算法和玩家社区的真实反馈，为你个性化推荐最适合的游戏。</p>
            <p>平台特色包括：个性化游戏推荐引擎、多维度游戏评测系统、实时游戏资讯、互动社区论坛、成就系统、AI智能助手等。</p>
          </>
        )}
      </section>

      {/* ========== 板块 1: Hero 滚动横幅 ========== */}
      <HeroBanner />

      {/* ========== 板块 2: 热门游戏推荐 ========== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
      >
        <HotGameRecommendations />
      </motion.div>

      {/* ========== 板块 3: 精选文章 ========== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <FeaturedArticles />
      </motion.div>

      {/* ========== 板块 4: 热门讨论 ========== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <HotDiscussions />
      </motion.div>

      {/* ========== 板块 5: 兑换码专区 ========== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <RedeemCodeSection />
      </motion.div>

      {/* ========== 板块 6: 社区宣传 CTA ========== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
      >
        <section className="mb-12">
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl border border-dark-700">
            <div className="py-2 px-6 md:px-12">
              <Row align="middle" gutter={[48, 24]}>
                <Col xs={24} lg={14}>
                  <Title level={2} className="!mb-4 !text-white">
                    {t('joinCommunity', '加入我们的游戏社区')}
                  </Title>
                  <Paragraph className="text-lg text-gray-300 !mb-6">
                    {t('communityDesc', '与全球数千名玩家交流互动。分享评测、讨论攻略、参加活动，结识志同道合的游戏伙伴。')}
                  </Paragraph>
                  <div className="flex flex-wrap gap-4">
                    <Button type="primary" size="large" onClick={() => navigate(`/${currentLang}/community-forum`)}>
                      {t('exploreCommunity', '探索社区')}
                    </Button>
                    <Button size="large" onClick={() => navigate(`/${currentLang}/register`)}>
                      {t('signUpFree', '免费注册')}
                    </Button>
                  </div>
                </Col>
                <Col xs={24} lg={10}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-purple-900/30 rounded-lg border border-purple-800/50">
                      <div className="text-3xl font-bold text-purple-400 mb-2">10K+</div>
                      <div className="text-gray-400 text-sm">{t('activeMembers', '活跃成员')}</div>
                    </div>
                    <div className="text-center p-4 bg-blue-900/30 rounded-lg border border-blue-800/50">
                      <div className="text-3xl font-bold text-blue-400 mb-2">5K+</div>
                      <div className="text-gray-400 text-sm">{t('gameReviews', '游戏评测')}</div>
                    </div>
                    <div className="text-center p-4 bg-green-900/30 rounded-lg border border-green-800/50">
                      <div className="text-3xl font-bold text-green-400 mb-2">500+</div>
                      <div className="text-gray-400 text-sm">{t('monthlyEvents', '每月活动')}</div>
                    </div>
                    <div className="text-center p-4 bg-orange-900/30 rounded-lg border border-orange-800/50">
                      <div className="text-3xl font-bold text-orange-400 mb-2">100+</div>
                      <div className="text-gray-400 text-sm">{t('discussionTopics', '讨论话题')}</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </section>
      </motion.div>

      {/* 平台简介（搜索引擎可见的文字版） */}
      <section className="mb-6">
        <div className="bg-gradient-to-r from-dark-800 to-dark-750 border border-dark-700 rounded-2xl p-6 md:p-8">
          <h2 className="sr-only">About GGHubs</h2>
          {i18n.language?.startsWith("en") ? (
            <p className="text-gray-300 text-base leading-relaxed">
              GGHubs is a comprehensive gaming community platform — discover game reviews, recommendations, guides, and connect with millions of gamers worldwide. Browse thousands of games across PC, PlayStation, Xbox, Nintendo Switch, and mobile platforms. Read professional reviews with detailed ratings, get personalized game recommendations powered by smart algorithms and community feedback, and join forum discussions to share strategies and tips. Start your game discovery journey at GGHubs today.
            </p>
          ) : (
            <p className="text-gray-300 text-base leading-relaxed">
              GGHubs（好游聚）是一个综合性游戏社区平台 — 在这里发现游戏评测、推荐、攻略，并与全球数百万玩家交流互动。浏览涵盖 PC、PlayStation、Xbox、Nintendo Switch 和手机平台的海量游戏库，阅读专业游戏评测，获取基于智能算法和社区反馈的个性化推荐，参与论坛讨论分享游戏策略和技巧。立即加入 GGHubs，开启你的游戏发现之旅。
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
