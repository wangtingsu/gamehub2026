/**
 * HeroBanner - 全宽轮播横幅组件
 *
 * 首页顶部的全宽轮播大图，自动播放精选内容。
 * 支持后台配置的 banner 数据，自动 fallback 到默认内容。
 * 使用 framer-motion 实现平滑过渡动画。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Skeleton } from 'antd';
import { RightOutlined, LeftOutlined } from '@ant-design/icons';
import { useBanners } from '../../api/hooks';

interface BannerItem {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  position?: string;
}

const fallbackBanners: BannerItem[] = [
  {
    id: 1,
    title: '🔥 热门游戏促销',
    subtitle: '限时折扣，低至3折',
    image_url: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=1200&auto=format&fit=crop',
    link_url: '/games/category/top-up',
  },
  {
    id: 2,
    title: '🎮 新游推荐',
    subtitle: '本月最受期待的新游戏',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop',
    link_url: '/games/category/new',
  },
  {
    id: 3,
    title: '🏆 2026年度游戏评选',
    subtitle: '为你喜欢的游戏投票',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop',
    link_url: '/games/category/awards',
  },
];

const HeroBanner = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { data: apiBanners, isLoading } = useBanners('home');

  const banners = (apiBanners && apiBanners.length > 0 ? apiBanners : fallbackBanners) as BannerItem[];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 视差滚动效果
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 自动播放
  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
  }, [banners.length]);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay]);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    startAutoPlay(); // 重置计时器
  };

  // 手动切换
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    startAutoPlay();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    startAutoPlay();
  };

  const handleCTAClick = (banner: BannerItem) => {
    if (banner.link_url) {
      if (banner.link_url.startsWith('/')) {
        navigate(`/${currentLang}${banner.link_url}`);
      } else {
        window.open(banner.link_url, '_blank');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="relative w-full h-[400px] md:h-[500px] bg-dark-800 rounded-2xl overflow-hidden">
        <Skeleton active paragraph={{ rows: 0 }} className="h-full" />
      </div>
    );
  }

  const currentBanner = banners[currentIndex];

  return (
    <section className="relative w-full h-[380px] sm:h-[450px] md:h-[520px] overflow-hidden rounded-2xl mb-10 border-2 border-primary-500/60 shadow-[0_0_30px_rgba(59,130,246,0.3)] ring-2 ring-primary-400/30">
      {/* Banner 图片区域 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="absolute inset-0"
          style={{
            transform: `translateY(${scrollY * 0.15}px)`,
          }}
        >
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.onerror = null;
              el.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500"><rect fill="%231e293b" width="1200" height="500"/><text fill="%2364748b" font-size="24" x="600" y="250" text-anchor="middle">GameHub</text></svg>';
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-900/70 to-transparent" />

      {/* 内容区 */}
      <div className="absolute inset-0 flex items-center">
        <div className="px-8 md:px-16 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentIndex}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <motion.h2
                className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                {currentBanner.title}
              </motion.h2>
              {currentBanner.subtitle && (
                <motion.p
                  className="text-sm sm:text-base md:text-lg text-gray-300 mb-6 max-w-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                >
                  {currentBanner.subtitle}
                </motion.p>
              )}
              {currentBanner.link_url && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.45 }}
                >
                  <Button
                    type="primary"
                    size="large"
                    icon={<RightOutlined />}
                    onClick={() => handleCTAClick(currentBanner)}
                    className="!bg-gradient-to-r !from-blue-600 !to-purple-600 !border-0 !px-6 !py-5 !text-base !font-semibold hover:!from-blue-500 hover:!to-purple-500"
                  >
                    了解更多
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 左箭头 */}
      <button
        onClick={handlePrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center transition-all duration-200 group"
        aria-label="上一张"
      >
        <LeftOutlined className="text-white text-lg group-hover:scale-110 transition-transform" />
      </button>

      {/* 右箭头 */}
      <button
        onClick={handleNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center transition-all duration-200 group"
        aria-label="下一张"
      >
        <RightOutlined className="text-white text-lg group-hover:scale-110 transition-transform" />
      </button>

      {/* 指示器圆点 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-8 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`切换到第 ${index + 1} 张图片`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroBanner;
