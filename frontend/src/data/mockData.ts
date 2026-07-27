// 静态测试数据

export interface Game {
  id: number;
  title: string;
  description: string;
  releaseDate: string;
  developer: string;
  publisher: string;
  genres: string[];
  platforms: string[];
  rating: number;
  price: number;
  discount?: number;
  imageUrl: string;
  screenshots: string[];
}

export interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  content: string;
  author: string;
  publishDate: string;
  category: string;
  tags: string[];
  imageUrl: string;
  views: number;
  likes: number;
}

export interface Review {
  id: number;
  gameId: number;
  gameTitle: string;
  title: string;
  content: string;
  author: string;
  rating: number;
  publishDate: string;
  likes: number;
  comments: number;
  tags: string[];
}

export interface CommunityPost {
  id: number;
  title: string;
  content: string;
  author: string;
  publishDate: string;
  likes: number;
  comments: number;
  tags: string[];
  category: string;
}

// 游戏数据
export const mockGames: Game[] = [
  {
    id: 1,
    title: "赛博朋克2077",
    description: "一款开放世界动作冒险游戏，故事发生在夜之城，一个痴迷于力量、魅力和身体改造的未来大都市。",
    releaseDate: "2020-12-10",
    developer: "CD Projekt Red",
    publisher: "CD Projekt",
    genres: ["角色扮演", "动作", "科幻"],
    platforms: ["PC", "PlayStation", "Xbox"],
    rating: 4.5,
    price: 298,
    discount: 20,
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w-800&auto=format&fit=crop"
    ]
  },
  {
    id: 2,
    title: "艾尔登法环",
    description: "以正统黑暗奇幻世界为舞台的动作RPG游戏。走进辽阔的场景与地下迷宫探索未知，挑战困难重重的险境，享受克服困境时的成就感吧。",
    releaseDate: "2022-02-25",
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    genres: ["动作", "角色扮演", "奇幻"],
    platforms: ["PC", "PlayStation", "Xbox"],
    rating: 4.8,
    price: 398,
    imageUrl: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=800&auto=format&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&auto=format&fit=crop"
    ]
  },
  {
    id: 3,
    title: "巫师3：狂猎",
    description: "扮演一名收钱办事的怪物杀手，在这个开放世界的角色扮演游戏中踏上旅程。",
    releaseDate: "2015-05-19",
    developer: "CD Projekt Red",
    publisher: "CD Projekt",
    genres: ["角色扮演", "动作", "奇幻"],
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    rating: 4.7,
    price: 158,
    discount: 50,
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&auto=format&fit=crop"
    ]
  },
  {
    id: 4,
    title: "只狼：影逝二度",
    description: "在战国时代的日本，玩家将扮演独臂之狼，一个名誉不再、伤痕累累的忍者，为拯救自己的主人而战。",
    releaseDate: "2019-03-22",
    developer: "FromSoftware",
    publisher: "Activision",
    genres: ["动作", "冒险"],
    platforms: ["PC", "PlayStation", "Xbox"],
    rating: 4.6,
    price: 268,
    imageUrl: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&auto=format&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop"
    ]
  },
  {
    id: 5,
    title: "荒野大镖客：救赎2",
    description: "美国，1899年。当警察开始打击残余亡命之徒的帮派时，蛮荒的西部时代迎来了最后的黄昏。",
    releaseDate: "2018-10-26",
    developer: "Rockstar Games",
    publisher: "Rockstar Games",
    genres: ["动作", "冒险", "西部"],
    platforms: ["PC", "PlayStation", "Xbox"],
    rating: 4.9,
    price: 249,
    discount: 30,
    imageUrl: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=800&auto=format&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop"
    ]
  }
];

// 新闻数据
export const mockNews: NewsArticle[] = [
  {
    id: 1,
    title: "《赛博朋克2077》全新DLC公布",
    summary: "CD Projekt Red宣布将为《赛博朋克2077》推出全新大型DLC，预计今年秋季上线。",
    content: "在今天的直播活动中，CD Projekt Red正式公布了《赛博朋克2077》的全新DLC《往日之影》。该DLC将带来全新的故事线、角色和游戏区域，预计将为玩家提供超过20小时的游戏内容。",
    author: "游戏前线",
    publishDate: "2026-04-05",
    category: "游戏新闻",
    tags: ["赛博朋克2077", "DLC", "CD Projekt Red"],
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop",
    views: 12500,
    likes: 850
  },
  {
    id: 2,
    title: "FromSoftware正在开发新IP",
    summary: "知名开发商FromSoftware确认正在开发一个全新的游戏IP，预计2027年发布。",
    content: "在最近的投资者会议上，FromSoftware的母公司角川集团透露，工作室正在开发一个全新的游戏IP。虽然具体细节尚未公布，但据称这将是一个完全不同于《艾尔登法环》和《只狼》的新类型游戏。",
    author: "游戏观察",
    publishDate: "2026-04-03",
    category: "行业动态",
    tags: ["FromSoftware", "新IP", "游戏开发"],
    imageUrl: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=800&auto=format&fit=crop",
    views: 8900,
    likes: 620
  },
  {
    id: 3,
    title: "Steam春季特卖即将开始",
    summary: "Valve宣布Steam春季特卖将于4月15日开始，持续一周时间。",
    content: "Valve官方确认，Steam春季特卖将于4月15日正式开始，持续到4月22日。届时将有数千款游戏参与折扣，包括许多3A大作和独立游戏。",
    author: "Steam资讯",
    publishDate: "2026-04-01",
    category: "促销信息",
    tags: ["Steam", "特卖", "折扣"],
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop",
    views: 15600,
    likes: 1100
  }
];

// 评测数据
export const mockReviews: Review[] = [
  {
    id: 1,
    gameId: 2,
    gameTitle: "艾尔登法环",
    title: "开放世界魂like的巅峰之作",
    content: "《艾尔登法环》成功地将魂系列的核心玩法与开放世界完美结合。广阔的地图、丰富的探索内容、极具挑战性的战斗，这一切都让这款游戏成为了近年来最出色的动作RPG之一。",
    author: "游戏评测师",
    rating: 9.5,
    publishDate: "2026-03-28",
    likes: 2450,
    comments: 186,
    tags: ["魂like", "开放世界", "FromSoftware"]
  },
  {
    id: 2,
    gameId: 1,
    gameTitle: "赛博朋克2077",
    title: "历经磨难后的完美重生",
    content: "经过多次更新和优化，《赛博朋克2077》终于兑现了最初的承诺。夜之城的细节令人惊叹，故事剧情引人入胜，现在的游戏体验已经非常出色。",
    author: "科技玩家",
    rating: 8.8,
    publishDate: "2026-03-25",
    likes: 1890,
    comments: 142,
    tags: ["赛博朋克", "RPG", "CD Projekt Red"]
  },
  {
    id: 3,
    gameId: 5,
    gameTitle: "荒野大镖客：救赎2",
    title: "西部世界的终极体验",
    content: "《荒野大镖客：救赎2》不仅仅是一款游戏，它是一部可以互动的西部史诗。从画面到剧情，从角色到世界，每一个细节都达到了业界顶尖水平。",
    author: "西部爱好者",
    rating: 9.7,
    publishDate: "2026-03-20",
    likes: 3120,
    comments: 254,
    tags: ["西部", "开放世界", "Rockstar"]
  }
];

// 社区帖子数据
export const mockCommunityPosts: CommunityPost[] = [
  {
    id: 1,
    title: "寻找《艾尔登法环》联机队友",
    content: "有没有人想一起挑战《艾尔登法环》的DLC内容？我主要玩法师build，希望找一些近战队友配合。",
    author: "法环爱好者",
    publishDate: "2026-04-06",
    likes: 45,
    comments: 12,
    tags: ["联机", "艾尔登法环", "队友"],
    category: "组队招募"
  },
  {
    id: 2,
    title: "分享我的《赛博朋克2077》捏脸数据",
    content: "花了3个小时捏出来的角色，感觉还不错，分享给大家参考。数据代码：CP77-XXXX-XXXX-XXXX",
    author: "捏脸大师",
    publishDate: "2026-04-05",
    likes: 128,
    comments: 36,
    tags: ["捏脸", "赛博朋克2077", "分享"],
    category: "游戏分享"
  },
  {
    id: 3,
    title: "《只狼》双难模式通关心得",
    content: "终于通关了双难模式，分享一些boss战的技巧和心得。特别是剑圣一心，打了整整两天才过...",
    author: "只狼高手",
    publishDate: "2026-04-04",
    likes: 89,
    comments: 24,
    tags: ["只狼", "攻略", "心得"],
    category: "攻略讨论"
  }
];

// 用户数据 (用于管理后台)
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'moderator' | 'user' | 'editor';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinDate: string;
  lastLogin: string;
  avatar?: string;
  gamesOwned: number;
  reviewsWritten: number;
}

export const mockUsers: User[] = [
  {
    id: 1,
    username: 'admin_user',
    email: 'admin@gamehub.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
    joinDate: '2025-01-15',
    lastLogin: '2026-04-14 14:30',
    gamesOwned: 45,
    reviewsWritten: 12,
  },
  {
    id: 2,
    username: 'moderator_jane',
    email: 'jane@gamehub.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'moderator',
    status: 'active',
    joinDate: '2025-03-20',
    lastLogin: '2026-04-14 10:15',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&auto=format&fit=crop',
    gamesOwned: 28,
    reviewsWritten: 8,
  },
  {
    id: 3,
    username: 'gamer_john',
    email: 'john@gamehub.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    status: 'active',
    joinDate: '2025-05-10',
    lastLogin: '2026-04-13 18:45',
    gamesOwned: 15,
    reviewsWritten: 3,
  },
  {
    id: 4,
    username: 'editor_mike',
    email: 'mike@gamehub.com',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'editor',
    status: 'active',
    joinDate: '2025-06-25',
    lastLogin: '2026-04-12 09:20',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop',
    gamesOwned: 32,
    reviewsWritten: 15,
  },
  {
    id: 5,
    username: 'newbie_alice',
    email: 'alice@gamehub.com',
    firstName: 'Alice',
    lastName: 'Williams',
    role: 'user',
    status: 'pending',
    joinDate: '2026-04-10',
    lastLogin: '2026-04-10 16:30',
    gamesOwned: 2,
    reviewsWritten: 0,
  },
  {
    id: 6,
    username: 'suspended_bob',
    email: 'bob@gamehub.com',
    firstName: 'Bob',
    lastName: 'Brown',
    role: 'user',
    status: 'suspended',
    joinDate: '2025-08-15',
    lastLogin: '2026-04-05 12:10',
    gamesOwned: 18,
    reviewsWritten: 5,
  },
  {
    id: 7,
    username: 'inactive_charlie',
    email: 'charlie@gamehub.com',
    firstName: 'Charlie',
    lastName: 'Davis',
    role: 'user',
    status: 'inactive',
    joinDate: '2025-02-28',
    lastLogin: '2026-03-01 14:20',
    gamesOwned: 7,
    reviewsWritten: 2,
  },
  {
    id: 8,
    username: 'pro_gamer',
    email: 'pro@gamehub.com',
    firstName: 'David',
    lastName: 'Wilson',
    role: 'user',
    status: 'active',
    joinDate: '2024-12-05',
    lastLogin: '2026-04-14 20:15',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop',
    gamesOwned: 89,
    reviewsWritten: 42,
  },
];

// 管理统计数据
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalGames: number;
  totalReviews: number;
  totalNews: number;
  revenue: number;
  growthRate: number;
}

export const mockAdminStats: AdminStats = {
  totalUsers: mockUsers.length,
  activeUsers: mockUsers.filter(u => u.status === 'active').length,
  newUsersToday: 12,
  totalGames: mockGames.length,
  totalReviews: mockReviews.length,
  totalNews: mockNews.length,
  revenue: 28450,
  growthRate: 15.3,
};