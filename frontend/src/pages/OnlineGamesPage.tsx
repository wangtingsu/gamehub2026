import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Input, Tag, Card, Rate, Pagination } from 'antd';
import { SearchOutlined, PlayCircleOutlined, UserOutlined } from '@ant-design/icons';
import SEO from '../components/SEO';
import type { OnlineGame } from '../api/types';

const { Title, Paragraph, Text } = Typography;

const onlineGames: OnlineGame[] = [
  {
    id: 'snake',
    name: 'Snake',
    description: 'Control a snake that keeps moving, eating food in an enclosed arena. Each piece of food makes your snake grow and speed up. As your body grows longer, your room to maneuver shrinks — plan your path precisely to avoid hitting the walls or your own tail.',
    category: 'Casual',
    icon: '🐍',
    color: 'from-green-500 to-emerald-600',
    component: 'SnakeGame',
    players: 2341,
    rating: 4.5,
    instructions: 'Use the arrow keys (↑↓←→) or WASD to steer. The snake moves forward continuously and cannot stop. Eat red food for 10 points; your snake grows one segment and speeds up slightly. The current score and high score are shown at the top. The game ends when your head hits a wall or any part of your body — press Space or click "Restart" to play again. Tip: hug the outer edge in loops to leave more room in the middle.',
  },
  {
    id: 'tetris',
    name: 'Tetris',
    description: 'Seven differently-shaped pieces fall steadily from the top of the screen, and you must quickly decide the best spot for each. Line up the blocks to fill an entire row and clear it for points; clearing multiple rows at once triggers combo bonuses. As you clear rows, the fall speed increases, ramping up the tension.',
    category: 'Puzzle',
    icon: '🧱',
    color: 'from-blue-500 to-cyan-600',
    component: 'TetrisGame',
    players: 3892,
    rating: 4.8,
    instructions: '← → move the current piece, ↑ rotates it, ↓ speeds up the fall, and Space drops it instantly. Filling an entire row clears it and shifts everything above down one row. The preview panel on the right shows the next piece so you can plan ahead. The game ends if the stack reaches the ceiling. Tip: keep the bottom flat and reserve one column for the long I piece — clearing four rows at once triggers a "Tetris" for maximum points.',
  },
  {
    id: 'brick-breaker',
    name: 'Brick Breaker',
    description: 'A paddle sits at the bottom of the screen while a ball bounces between the paddle and a wall of bricks. Move the paddle to catch and bounce the ball back up to smash the colorful bricks. Every brick you break scores points; clear them all to pass the level. Different colors are worth different points, and some bricks need several hits to shatter.',
    category: 'Action',
    icon: '🧱',
    color: 'from-orange-500 to-red-600',
    component: 'BrickBreakerGame',
    players: 1876,
    rating: 4.3,
    instructions: 'Move your mouse (or slide your finger on touch screens) to steer the paddle horizontally. The ball bounces at different angles depending on where it hits the paddle — center hits bounce straight up, edge hits fly off at sharp angles. The ball bounces off the left, right, and top walls, but you lose a life (3 total) if it falls past the bottom. Some bricks drop power-ups when destroyed — wider paddle, slower ball, an extra life — catch them with the paddle to activate.',
  },
  {
    id: 'gobang',
    name: 'Gomoku',
    description: 'Play Gomoku (Five in a Row) against the AI on a 15×15 board. You play black and move first; the AI plays white. Take turns placing stones on the intersections, aiming to be the first to connect five in a row horizontally, vertically, or diagonally. The AI has multiple difficulty levels and will attack while also defending against your open threes and fours.',
    category: 'Strategy',
    icon: '⚫',
    color: 'from-purple-500 to-indigo-600',
    component: 'GobangGame',
    players: 4567,
    rating: 4.7,
    instructions: 'Click any intersection to place your stone — yours are solid black circles, the AI\'s are hollow white circles. The top status bar shows whose turn it is. The first player to line up five in a row wins; if the board fills with no winner it\'s a draw. Click "New Game" to reset. Tip: creating two open threes at once (a double-three) is a winning tactic — your opponent can\'t block both.',
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    description: 'A grid of squares hides hidden mines, and you must use the number clues to deduce which squares are safe. Each revealed number tells you how many mines are in the 8 surrounding squares. Use logic to flag the mines and reveal the safe area, until every non-mine square is uncovered.',
    category: 'Puzzle',
    icon: '💣',
    color: 'from-gray-600 to-gray-800',
    component: 'MinesweeperGame',
    players: 2987,
    rating: 4.4,
    instructions: 'Left-click an unrevealed square to open it — if it holds a mine, the game ends instantly and all mines are revealed. If not, it shows a number (0-8) indicating nearby mines. Right-click to plant a red flag marking a mine, click again for a question mark, and a third time to clear. If a revealed number already has matching flags around it, double-click it to auto-reveal the remaining squares. The top-left shows mines remaining, the top-right is a timer.',
  },
  {
    id: 'game2048',
    name: '2048',
    description: 'On a 4×4 board, each move slides all number tiles in one direction, merging adjacent equal numbers into their sum — 2 and 2 become 4, 4 and 4 become 8, and so on. After each move a new 2 or 4 appears in a random empty cell. Keep merging to build bigger numbers, aiming for 2048 and beyond.',
    category: 'Puzzle',
    icon: '🔢',
    color: 'from-amber-500 to-yellow-600',
    component: 'Game2048',
    players: 5432,
    rating: 4.9,
    instructions: 'Press the arrow keys (↑↓←→) or swipe to slide all tiles in that direction until they hit a wall or a different number. Adjacent equal tiles merge into one with their sum. After each valid move, a 2 (likely) or 4 (less likely) spawns in an empty cell. The game ends when the board is full and no adjacent tiles can merge. The top shows your score and high score. Tip: pick one corner (bottom-right works well), keep your biggest number pinned there, and push from the small-number side toward it.',
  },
  {
    id: 'memory',
    name: 'Memory Match',
    description: 'Pairs of matching cards lie face-down, shuffled on the table. Flip two cards at a time — if they match, they stay face-up; if not, they flip back. Memorize each card\'s position and picture to find all pairs within a limited number of flips. As levels advance, more cards are added to test your memory.',
    category: 'Casual',
    icon: '🃏',
    color: 'from-pink-500 to-rose-600',
    component: 'MemoryGame',
    players: 1567,
    rating: 4.2,
    instructions: 'Click a face-down card to reveal its picture, then click another. If the two pictures are identical, the pair stays revealed and highlighted. If not, both flip back after about 0.8 seconds. The top shows your flip count and matched pairs. Clear all pairs to win — fewer flips and faster times earn a higher score. Tip: start by memorizing the four corners, and prioritize cards you recognize when flipping.',
  },
  {
    id: 'pong',
    name: 'Pong',
    description: 'The classic two-player Pong, solo — you control the left paddle, the AI controls the right. Keep the ball in play by moving to its landing spot and returning it to the opponent\'s side. If the ball gets past your paddle, the opponent scores. The AI plays at a fair difficulty and will send tricky angled shots to test your reflexes.',
    category: 'Action',
    icon: '🏓',
    color: 'from-teal-500 to-green-600',
    component: 'PongGame',
    players: 3210,
    rating: 4.6,
    instructions: 'Move your mouse up and down (or slide on the right side of the screen) to control your green paddle\'s vertical position, hugging the left edge. The ball bounces at different angles depending on where it hits the paddle — center hits return straight, edge hits fly off at sharp angles. The ball bounces off the top and bottom walls normally. The right-side AI tracks the ball but won\'t always reach your sharpest shots. First to 5 points wins; the score is shown at the top.',
  },
  {
    id: 'tank-battle',
    name: 'Tank Battle',
    description: 'Drive a yellow tank through a brick-walled maze, battling waves of red enemy tanks. The map mixes destructible brick walls with indestructible steel walls — use cover to dodge enemy fire, or shoot through bricks to open new routes. Your base (an eagle icon) sits at the bottom; if it\'s destroyed, the game ends. Clear every enemy tank to pass the level.',
    category: 'Action',
    icon: '🎮',
    color: 'from-green-700 to-yellow-600',
    component: 'TankBattle',
    players: 1876,
    rating: 4.7,
    instructions: 'Use the arrow keys or WASD to move in eight directions. Press Space or Enter to fire — one shot at a time; it disappears on hitting a wall or enemy before you can fire again. Red enemy tanks move randomly and shoot toward you. Some flashing red tanks drop power-ups (★) when destroyed — extra life, temporary invincibility, freeze all enemies, or fortify your base — drive over them to collect. The top-left shows enemies remaining, the bottom-left your lives.',
  },
  {
    id: 'magic-trampoline',
    name: 'Magic Trampoline',
    description: 'A little character bounces endlessly on a trampoline. Move the trampoline left and right to catch them while collecting golden stars floating in the air. As you climb higher, red spike obstacles grow more frequent — one touch sends your character flying. Bright visuals and bouncy rhythm make it easy to pick up but hard to master, perfect for a quick session.',
    category: 'Casual',
    icon: '☀️',
    color: 'from-pink-500 to-purple-600',
    component: 'MagicTrampoline',
    players: 1234,
    rating: 4.5,
    instructions: 'Use ← → (or slide on the sides of the screen) to move the trampoline. The character bounces automatically — bounce height depends on where you catch them: the trampoline\'s center launches highest, the edges barely bounce. Golden stars in the air are collected on contact for 10 points each. Touching a red spike sends the character flying and ends the game. The left side shows your height (meters) and score. Tip: when falling low, don\'t rush to catch — let a few bounces climb you back to safety.',
  },
  {
    id: 'space-shooter',
    name: 'Space Shooter',
    description: 'Pilot a starfighter against endless waves of alien ships. Your fighter fires automatically while enemies stream in from the top — grunts, fast divers, and tanky bosses. Destroying enemies drops firepower upgrades, shields, and bonus stars. As your score climbs, enemy density and bullet patterns escalate into a bullet-hell frenzy that gets your adrenaline pumping.',
    category: 'Action',
    icon: '✈️',
    color: 'from-cyan-500 to-blue-700',
    component: 'SpaceShooter',
    players: 3456,
    rating: 4.8,
    instructions: 'Use ↑↓←→ (or swipe) to fly freely. Your fighter auto-fires forward — no manual shooting. Destroying red small enemies scores +10; golden large enemies score +50 and drop items. Items: yellow S — spread three-way shot, blue P — stronger bullets, green shield — one hit absorbed, purple star — bonus points. The top shows your score, the top-left your lives. Getting hit by enemies or bullets costs a life; at zero, the game ends.',
  },
  {
    id: 'whack-a-mole',
    name: 'Whack-a-Mole',
    description: 'Nine holes line up on the table, and cute-but-sneaky moles pop up at random — whack them as fast as you can! Moles appear at unpredictable spots and times, sometimes one after another in the same hole, sometimes several at once. Occasionally a golden helmeted mole appears for bonus points. A classic arcade test of speed and reflexes.',
    category: 'Casual',
    icon: '🔨',
    color: 'from-yellow-700 to-green-700',
    component: 'WhackAMole',
    players: 2345,
    rating: 4.4,
    instructions: 'With a 30-second countdown, moles pop out of the 3×3 grid of 9 holes and retreat after about 0.8–1.5 seconds. Click (or tap) a mole before it retreats to score — normal brown moles are +10, golden-helmet moles are +30. Clicking an empty hole scores nothing but costs nothing. When time runs out, your score and high score are shown. Tip: keep your cursor near the center and use small wrist movements rather than sweeping across the whole board.',
  },
  {
    id: 'match-three',
    name: 'Match-3',
    description: 'An 8×8 board is filled with colorful gems. Swap two adjacent gems so three or more of the same color line up — they\'ll pop and clear, gems above fall into place, and new gems drop from the top. Matching 4 creates a striped gem (clears a whole row/column); matching 5 creates a rainbow gem (clears every gem of one color). Chain reactions trigger combos that multiply your score.',
    category: 'Puzzle',
    icon: '💎',
    color: 'from-red-500 to-orange-500',
    component: 'MatchThree',
    players: 4567,
    rating: 4.9,
    instructions: 'Click a gem to select it (it pulses), then click an adjacent gem to swap them. If the swap forms a line of 3+ matching gems, they clear and score; if not, the gems bounce back at no cost. Matching 4 creates a striped gem that clears an entire row or column. Matching 5 creates a rainbow gem — swap it with any neighboring gem to clear all gems of that color. The top-right shows your moves and target score; reach the target to pass.',
  },
  {
    id: 'speed-racer',
    name: 'Speed Racer',
    description: 'Race down a straight three-lane highway as slower cars keep appearing ahead of you. Switch lanes to weave through traffic while passing as close as possible for extra points. Speed rises with distance, going from a relaxing cruise to a full-on rush — hit a car and you\'re done.',
    category: 'Action',
    icon: '🏎️',
    color: 'from-red-600 to-orange-600',
    component: 'SpeedRacer',
    players: 2876,
    rating: 4.6,
    instructions: 'Use ← and → (or swipe) to switch one lane left or right. Your car drives forward automatically while slower vehicles (sedans, trucks) appear randomly across the lanes — read the road and change lanes to dodge. Passing extremely close to another car without colliding counts as a "near miss" for bonus points and a COOL prompt. The speed bar at the top fills as you drive. Hitting any vehicle ends the game instantly, showing your distance and best record.',
  },
  {
    id: 'bubble-shooter',
    name: 'Bubble Shooter',
    description: 'A cluster of colorful bubbles hangs from the top, and a shooter sits at the bottom. Aim at bubbles of the same color and fire to connect them — when 3 or more matching bubbles touch, they pop. A shot that doesn\'t form a match sticks to the cluster and pushes it downward. Once the bubbles cross the bottom warning line, you lose.',
    category: 'Puzzle',
    icon: '🫧',
    color: 'from-blue-400 to-purple-500',
    component: 'BubbleShooter',
    players: 1987,
    rating: 4.5,
    instructions: 'Move your mouse (or swipe) to aim, with a dotted guideline showing your shot\'s path. Click (or tap) to fire the current bubble. It stops on hitting the ceiling or existing bubbles; if it forms a group of 3+ same-colored bubbles, they all pop. Bubbles left hanging below the cleared group with no connection to the top also drop and score. A preview beside the shooter shows the next bubble\'s color. The warning line grows more urgent each row the cluster descends.',
  },
  {
    id: 'sliding-puzzle',
    name: 'Sliding Puzzle',
    description: 'A 4×4 board with 16 cells holds tiles numbered 1 through 15, leaving one empty space. The tiles are scrambled, and you must slide adjacent tiles into the gap to restore the numbers to their correct 1–15 order, top-to-bottom, left-to-right. Looks simple, but it\'s a serious test of patience and planning.',
    category: 'Puzzle',
    icon: '🔢',
    color: 'from-blue-600 to-indigo-600',
    component: 'SlidingPuzzle',
    players: 1654,
    rating: 4.3,
    instructions: 'Click a numbered tile adjacent to the empty space (up, down, left, or right) to slide it into the gap; its old spot becomes the new gap. Only tiles touching the gap can move — diagonal and distant tiles can\'t be moved directly, so plan multi-step routes. The top shows your move count and best record. You win when 1–4 fill the first row, 5–8 the second, 9–12 the third, and 13–15 the fourth. Tip: solve the first row and column first, then handle the inner blocks, and finally rotate the bottom-right 2×2 a few times to finish.',
  },
  {
    id: 'jump-adventure',
    name: 'Jump Adventure',
    description: 'A small cube stands on a platform with the next one ahead. Hold to charge and release to jump, landing the cube precisely on the next platform. Gaps and platform sizes vary — some are close and need a light tap, others are far and need full power. Landing dead-center earns a perfect bonus; landing on the edge leaves you teetering; overshooting sends you into the void. Each jump is +1, and judging the distance is everything.',
    category: 'Action',
    icon: '🦘',
    color: 'from-teal-400 to-green-500',
    component: 'JumpAdventure',
    players: 3120,
    rating: 4.7,
    instructions: 'Hold the left mouse button (or press and hold on the screen) to crouch and charge — a dynamic power bar stretches longer as you hold, and a longer bar means a farther jump. Release to leap in an arc. Landing in the center zone (the middle ~20% of the platform) triggers a "Perfect Landing" for +2 and a special effect. Land past the edge and you fall into the void, ending the game with your score and best record shown. Tip: the first few gaps are similar — learn how bar length maps to gap distance and you\'ll soon be flying.',
  },
  {
    id: 'archery-master',
    name: 'Archery Master',
    description: 'Stand at the firing line with a circular target hanging at a set distance. Draw, aim, and release to hit the bullseye. The target is divided into 10 rings, from 1 point at the outer edge to 10 at the center — the closer to the bullseye, the higher the score. Wind shifts randomly and bends your arrow\'s path, so adjust your aim to the wind gauge. Each round is 10 arrows; highest total wins.',
    category: 'Casual',
    icon: '🏹',
    color: 'from-amber-600 to-yellow-500',
    component: 'ArcheryMaster',
    players: 1432,
    rating: 4.4,
    instructions: 'Hold the left mouse button (or press and hold) to draw — the bowstring and power bar stretch back as you hold; longer draws fly farther and harder, but at full draw the bow starts to tremble and accuracy drops. Release to fire. The top-left shows the wind gauge — wind from the left pushes arrows right, from the right pushes left, so offset your aim accordingly. Each hit shows its ring score (1–10); the top-right shows arrows fired and total. After all 10 arrows, you get a rating: 90+ is S-rank, 80–89 is A-rank.',
  },
  {
    id: 'guandan',
    name: 'Guandan',
    description: 'A four-player, two-team trick-taking card game using two decks (108 cards, two jokers each). You and the AI across from you are partners; the other two AIs are your opponents. Starting from 2, the winning side levels up each round (2→3→4…→A). The card type system is rich — singles, pairs, straights, plus bombs, straight flushes, and rockets for dominance. Bombs beat normal plays, bigger bombs beat smaller ones, and the strategy of how you meld and play runs deep.',
    category: 'Strategy',
    icon: '🃏',
    color: 'from-red-600 to-orange-500',
    component: 'GuandanGame',
    players: 5680,
    rating: 4.8,
    instructions: 'You and the AI across from you form one team (East-West); the other two AIs are your opponents (North-South). Each round the winner of the previous trick leads (the first round is random), with play proceeding counter-clockwise. You may play a higher combination of the same type or pass. When the other three players pass consecutively, the last player to play leads the next trick. All card types are supported: single, pair, triple, triple-with-pair, straight (5 consecutive singles), steel plate (two consecutive triples), bundle (three consecutive pairs), bomb (4 of a kind), straight flush (5 consecutive same-suit), and rocket (4 jokers). Bombs beat any non-bomb play; bigger bombs beat smaller ones. The first team to empty both players\' hands wins the round and levels up; win again at A to take the whole game.',
  },
];

const categories = ['All', 'Casual', 'Puzzle', 'Action', 'Strategy'];

const OnlineGamesPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';

  // Online games FAQ structured data
  const structuredData = [
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.gghubs.com' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Online Games', 'item': `${siteUrl}/${currentLang}/library/online` },
      ],
    },
    {
      '@type': 'ItemList',
      'name': 'Free Online Mini Games Collection',
      'description': 'GameHub offers 20+ free online mini games',
      'itemListElement': onlineGames.map((game, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
          '@type': 'VideoGame',
          'name': game.name,
          'description': game.description,
          'genre': game.category,
          'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
          'url': `${siteUrl}/${currentLang}/library/play/${game.id}`,
        },
      })),
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'Do these online games need to be downloaded?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Not at all! All games run directly in your browser — click to play with no downloads or installation.',
          },
        },
        {
          '@type': 'Question',
          'name': 'Are the online games free?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes, all mini games on GameHub are completely free — play everything without paying a cent.',
          },
        },
        {
          '@type': 'Question',
          'name': 'Can I play these games on my phone?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes! All games are optimized for desktop and mobile browsers, so you can play anytime, anywhere.',
          },
        },
        {
          '@type': 'Question',
          'name': 'Do I need an account to play?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'No registration required — play without logging in. Registering an account lets you save progress and join community discussions.',
          },
        },
      ],
    },
  ];

  const filteredGames = useMemo(() => {
    let result = [...onlineGames];
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(g => g.name.includes(q) || g.description.includes(q));
    }
    if (selectedCategory !== 'All') {
      result = result.filter(g => g.category === selectedCategory);
    }
    return result;
  }, [searchText, selectedCategory]);

  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGames.slice(start, start + pageSize);
  }, [filteredGames, currentPage]);

  return (
    <div className="bg-dark-900">
      <SEO
        title="Free Online Mini Games - Instant Play, No Download | GameHub"
        description="GameHub offers 20+ free online mini games, including Snake, Tetris, 2048, Gomoku, Minesweeper and more classics. No download needed — play instantly in your browser, on desktop or mobile."
        keywords="online games, free mini games, web games, snake, tetris, 2048, gomoku, minesweeper, HTML5 games, browser games, instant play, no download"
        structuredData={structuredData}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2">
        <div className="">
          <div className="text-center">
            <Title level={1} className="!text-white mb-4">Online Games</Title>
            <Paragraph className="!text-indigo-100 !text-lg mb-8">No download, play instantly</Paragraph>
            <div className="max-w-xl mx-auto">
              <Input
                size="large"
                placeholder="Search games..."
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
              {cat}
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
                  <Tag color="default" className="bg-dark-700 text-gray-300 border-0">{game.category}</Tag>
                </div>

                <Title level={3} className="!text-white !text-base !mb-1">{game.name}</Title>
                <Paragraph className="!text-gray-400 !text-sm !mb-3 line-clamp-2">{game.description}</Paragraph>

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
            <Title level={3} className="!text-gray-400">No matching games found</Title>
            <Paragraph className="!text-gray-500">Try another keyword or category</Paragraph>
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
