import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the games API hook
jest.mock('../../api/hooks', () => ({
  useGames: jest.fn(),
  usePersonalizedRecommendations: jest.fn().mockReturnValue({ data: [], isLoading: false, isError: false }),
}));

// Mock other heavy dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('react-lazy-load-image-component', () => ({
  LazyLoadImage: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

jest.mock('../../components/SEO', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Initialize i18n
i18n.init({
  lng: 'zh-CN',
  resources: {
    'zh-CN': {
      games: {
        'page.title': '游戏库',
        'search.placeholder': '搜索游戏',
        'filter.genre': '类型',
        'filter.platform': '平台',
      },
    },
  },
});

const mockGames = [
  {
    id: '1',
    title: '赛博朋克2077',
    slug: 'cyberpunk-2077',
    description: '测试描述',
    releaseDate: '2020-12-10',
    developer: 'CD Projekt Red',
    publisher: 'CD Projekt',
    genres: ['角色扮演', '科幻'],
    platforms: ['PC', 'PS5'],
    rating: 4.5,
    price: 298,
    discount: 30,
    coverImageUrl: 'https://example.com/image.jpg',
    screenshots: ['https://example.com/screenshot.jpg'],
    steamAppId: 1091500,
    rawgId: 41494,
    isFeatured: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

import { useGames } from '../../api/hooks';

describe('GamesPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useGames as jest.Mock).mockReturnValue({
      data: mockGames,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  const renderGamesPage = () => {
    const GamesPage = require('../GamesPage').default;
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <GamesPage />
          </BrowserRouter>
        </I18nextProvider>
      </QueryClientProvider>
    );
  };

  it('应该渲染游戏列表', () => {
    renderGamesPage();
    const titles = screen.getAllByText('赛博朋克2077');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('加载中应显示 Spin', () => {
    (useGames as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    });

    renderGamesPage();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('错误时应显示错误信息', () => {
    (useGames as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: { message: '加载失败' },
    });

    renderGamesPage();
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
  });
});
