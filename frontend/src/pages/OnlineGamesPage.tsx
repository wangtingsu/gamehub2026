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
    name: '贪吃蛇',
    description: '操控一条不断游走的贪吃蛇，在封闭的场地中四处觅食。每吃到一个食物，蛇身就会增长一截，速度也随之加快。随着身体越来越长，走位空间逐渐缩小，需要精准预判路线，在狭窄空间中闪转腾挪，避免撞墙或咬到自己尾巴。',
    category: '休闲',
    icon: '🐍',
    color: 'from-green-500 to-emerald-600',
    component: 'SnakeGame',
    players: 2341,
    rating: 4.5,
    instructions: '使用键盘方向键（↑↓←→）或 WASD 控制蛇的移动方向，蛇会持续向前移动无法停止。吃到红色食物得 10 分，蛇身增长一格，移动速度小幅提升。屏幕上方显示当前分数和历史最高分。蛇头碰到四周墙壁或身体任意部位即游戏结束，按空格键或点击"重新开始"可以再来一局。小技巧：尽量贴着场地外围绕圈，留出更大的中间空间。',
  },
  {
    id: 'tetris',
    name: '俄罗斯方块',
    description: '不同形状的七种方块从屏幕顶部匀速下落，你需要快速判断每一块的最佳落点。将方块整齐排列填满一行即可消除得分，连续消除多行触发 combo 加分。随着消除行数增加，下落速度逐渐提升，紧张感层层递进。',
    category: '益智',
    icon: '🧱',
    color: 'from-blue-500 to-cyan-600',
    component: 'TetrisGame',
    players: 3892,
    rating: 4.8,
    instructions: '← → 方向键左右移动当前方块，↑ 键旋转方块改变朝向，↓ 键加速下落，空格键让方块直接落底。每填满一整行即自动消除，上方所有方块整体下移一行。右侧预览区会显示下一个方块的形状，提前规划摆放策略。顶部积压到天花板则游戏结束。小技巧：尽量保持底部平整，预留一条竖列给长条 I 方块，一次消除四行可触发"俄罗斯方块"最高加分。',
  },
  {
    id: 'brick-breaker',
    name: '打砖块',
    description: '屏幕底部有一块可移动的挡板，一个小球在挡板和砖块之间来回弹跳。你需要操控挡板接住并反弹小球，让小球撞击上方的彩色砖块群。每击碎一块砖得分，砖块全部清除即过关。不同颜色的砖块分值不同，部分砖块需要多次击打才会碎裂。',
    category: '动作',
    icon: '🧱',
    color: 'from-orange-500 to-red-600',
    component: 'BrickBreakerGame',
    players: 1876,
    rating: 4.3,
    instructions: '左右移动鼠标（或手指在触屏上滑动）控制底部挡板，挡板跟随光标水平移动。小球碰到挡板会以不同角度反弹——击中挡板中间垂直弹出，击中边缘则以大角度斜飞。小球碰到左右墙壁和顶部会反弹，但从底部漏出则扣一条命，共 3 条命。部分砖块被击碎后会掉落道具：加宽挡板、减速小球、额外一条命等，用挡板接住即可生效。',
  },
  {
    id: 'gobang',
    name: '五子棋',
    description: '在 15×15 的围棋棋盘上与 AI 进行五子棋对决。你执黑子先手落子，AI 执白子应对。双方轮流在棋盘交叉点上落子，目标是让自己的棋子率先在横、竖、斜任一方向上连成五颗。AI 拥有多级难度，会主动进攻同时也会防守你的活三、冲四等威胁。',
    category: '策略',
    icon: '⚫',
    color: 'from-purple-500 to-indigo-600',
    component: 'GobangGame',
    players: 4567,
    rating: 4.7,
    instructions: '点击棋盘上任一交叉点即可在该位置落子，你的棋子显示为黑色实心圆，AI 的棋子为白色空心圆。当前轮到谁落子会在顶部状态栏提示。任意一方在水平、垂直或两条对角线方向上率先连成五颗即获胜，若棋盘下满无人连五则为平局。点击"新游戏"按钮清空棋盘重开。小技巧：同时制造两个方向的活三（双活三）是必胜手段，对手无法同时封堵两路。',
  },
  {
    id: 'minesweeper',
    name: '扫雷',
    description: '在一个布满隐藏地雷的方格矩阵中，你需要通过数字线索推断每个格子下方是否有雷。每个已翻开的格子上显示的数字，代表其周围 8 个相邻格子中隐藏的地雷数量。运用逻辑排除法，一步步标记雷区、翻开安全区域，直到揭开所有非雷格子即为胜利。',
    category: '益智',
    icon: '💣',
    color: 'from-gray-600 to-gray-800',
    component: 'MinesweeperGame',
    players: 2987,
    rating: 4.4,
    instructions: '左键点击未翻开的格子进行翻开操作——如果下方有雷，游戏立刻结束，所有地雷显形。如果下方无雷，格子翻开并显示数字（0-8），表示周围雷数。右键点击格子插上红旗标记为地雷，再次右键切换为问号（不确定），第三次右键取消标记。翻开的数字如果周围红旗数已匹配，双击该数字可自动翻开周围剩余未标记的格子。顶部左侧显示剩余雷数，右侧为计时器。',
  },
  {
    id: 'game2048',
    name: '2048',
    description: '在一个 4×4 的方格面板上，每次操作会让所有数字方块向一个方向整体滑动，相邻的相同数字会合并为它们的和。例如 2 和 2 合并为 4，4 和 4 合并为 8，以此类推。每次操作后会在随机空格出现一个新的 2 或 4。目标是不断合成更大的数字，最终拼出 2048 甚至 4096、8192。',
    category: '益智',
    icon: '🔢',
    color: 'from-amber-500 to-yellow-600',
    component: 'Game2048',
    players: 5432,
    rating: 4.9,
    instructions: '按键盘方向键（↑↓←→）或在触屏上滑动，所有方块会向指定方向整体移动，直到碰到墙壁或不同数字的方块。相邻且数字相同的两个方块在移动中合并为一个新方块，值为两数之和。每次有效操作后，空白处随机生成 2（大概率）或 4（小概率）。当方格被填满且无可合并的相邻数字时游戏结束。顶部显示当前分数和历史最高分。小技巧：选定一个角落（推荐右下角），尽量让大数字固定在那里不动，从小数字一侧往大数字方向推。',
  },
  {
    id: 'memory',
    name: '记忆翻牌',
    description: '若干对图案相同的卡片面朝下随机排列在桌面上。每次翻开两张卡片，如果图案相同则配对成功、保持翻开状态；如果不同则两张卡片翻回背面。你需要记住每张卡片的位置和图案，在有限的翻牌次数内找出所有配对。随着关卡推进，卡片数量逐渐增加，挑战记忆力极限。',
    category: '休闲',
    icon: '🃏',
    color: 'from-pink-500 to-rose-600',
    component: 'MemoryGame',
    players: 1567,
    rating: 4.2,
    instructions: '点击任意一张背面朝上的卡片翻开它，显示卡片正面的图案。再点击另一张卡片——如果两张图案完全相同（颜色、形状一致），配对成功，两张卡片保持翻开状态并高亮显示。如果两张图案不同，约 0.8 秒后两张卡片同时翻回。顶部显示当前翻开次数和已配对数量。当所有卡片配对完成即为通关，用时越短、翻牌次数越少评分越高。小技巧：先从四个角开始记，每次翻第一张时优先选择印象中见过的位置。',
  },
  {
    id: 'pong',
    name: '乒乓球',
    description: '经典双人对打乒乓球的单人版——你控制左侧球拍，AI 控制右侧球拍。小球在球桌上来回弹跳，你需要精准移动到小球的落点位置，用球拍将球打回对方半场。如果球飞过你的球拍落入身后，对方得分。AI 的难度适中，会故意打出大角度刁钻回球考验你的反应。',
    category: '动作',
    icon: '🏓',
    color: 'from-teal-500 to-green-600',
    component: 'PongGame',
    players: 3210,
    rating: 4.6,
    instructions: '上下移动鼠标（或手指在触屏右侧上下滑动）控制左侧绿色球拍的纵向位置，球拍紧贴左边缘移动。小球碰到球拍后会根据撞击位置以不同角度反弹：打到球拍中心小球垂直弹出，打到边缘小球以锐角斜飞。小球碰到上下墙壁正常反弹。右侧 AI 球拍会自动追踪小球位置，但你打出的大角度球 AI 不一定能接到。先得到 5 分者获胜，屏幕上方显示双方比分。',
  },
  {
    id: 'tank-battle',
    name: '坦克大战',
    description: '操控一辆黄色坦克在砖墙迷宫般的地图中移动，对抗不断出现的红色敌军坦克。地图中分布着可被子弹摧毁的砖墙和不可摧毁的钢铁墙，你可以利用地形掩护躲避敌人子弹，也可以开火摧毁砖墙开辟新路线。屏幕底部是你的基地（鹰形图标），一旦基地被摧毁游戏立即结束。你需要消灭地图上的全部敌军坦克来过关。',
    category: '动作',
    icon: '🎮',
    color: 'from-green-700 to-yellow-600',
    component: 'TankBattle',
    players: 1876,
    rating: 4.7,
    instructions: '方向键或 WASD 四个键控制坦克上下左右移动（可在左上、右上等八个方向自由移动）。空格键或 Enter 键发射子弹，每次只能发射一发，子弹碰到墙壁或敌方坦克后消失，之后才能再次发射。红色敌军坦克会随机移动并朝你所在方向射击。部分闪光的红色坦克被消灭后会掉落道具（★ 星形图标）：加一条命、暂时无敌、冰冻所有敌人、加固基地围墙等，驾驶坦克碰到道具即可拾取。屏幕左上角显示剩余敌军数量，左下角显示剩余生命数。',
  },
  {
    id: 'magic-trampoline',
    name: '魔力蹦蹦床',
    description: '一个小角色站在蹦床上不停上下弹跳，你需要左右移动蹦床接住角色，同时收集空中飘浮的金色星星。随着高度不断攀升，红色尖刺障碍越来越多，一旦角色碰到尖刺就会飞出去。弹跳节奏轻快，画面色彩明亮，上手简单但高分不易，适合闲暇时随手来一局。',
    category: '休闲',
    icon: '☀️',
    color: 'from-pink-500 to-purple-600',
    component: 'MagicTrampoline',
    players: 1234,
    rating: 4.5,
    instructions: '← → 方向键（或在触屏左右两侧滑动）控制蹦床水平移动。角色从高处落下碰到蹦床会自动弹起，弹起高度取决于你接住角色时蹦床的位置——蹦床正中心弹起最高，越靠近边缘弹力越小。空中散布的金色星星碰到即可收集，每颗加 10 分。红色尖刺障碍碰到立刻导致角色飞出、游戏结束。左侧显示当前高度（米）和累计分数。小技巧：落到很低的位置时不要急着接，让角色再弹几下爬升到安全高度再说。',
  },
  {
    id: 'space-shooter',
    name: '飞机大战',
    description: '驾驶一架星际战机在太空中迎战源源不断的外星舰队。你的战机会自动连续开火，敌人从屏幕上方一波波出现，有普通小兵、快速俯冲机和厚血 Boss。击毁敌机会随机掉落火力升级道具、护盾和加分星星。随着分数提高，敌人密度和弹幕强度逐步升级，弹幕地狱般的战斗体验让你肾上腺素飙升。',
    category: '动作',
    icon: '✈️',
    color: 'from-cyan-500 to-blue-700',
    component: 'SpaceShooter',
    players: 3456,
    rating: 4.8,
    instructions: '↑↓←→ 方向键（或手指在屏幕上滑动）控制战机自由移动。战机自动向前方发射子弹，无需手动开火。击毁红色小敌机 +10 分，击毁金色大敌机 +50 分且掉落道具。道具类型：黄色 S 图标——子弹变为三连发散弹，蓝色 P 图标——子弹威力增强，绿色盾图标——获得一层护盾可抵消一次撞击伤害，紫色星图标——额外加分。屏幕顶部显示分数，左上角显示剩余生命数。被敌机或子弹击中扣一条命，生命归零游戏结束。',
  },
  {
    id: 'whack-a-mole',
    name: '打地鼠',
    description: '9 个地洞整齐排列在桌面上，可爱又狡猾的地鼠随机从洞中探出头来，你需要以最快的速度点击敲打它们。地鼠探头的位置和时间完全随机，有时候一个洞里会连续冒出，有时候好几个洞同时冒头。偶尔还会有戴头盔的金色地鼠出现，打中它能获得额外加分！考验你的手速和反应力的经典街机玩法。',
    category: '休闲',
    icon: '🔨',
    color: 'from-yellow-700 to-green-700',
    component: 'WhackAMole',
    players: 2345,
    rating: 4.4,
    instructions: '倒计时 30 秒，游戏开始后地鼠会从 3×3 的 9 个洞中随机钻出，停留约 0.8-1.5 秒后自动缩回。在地鼠缩回之前用鼠标点击（或手指点击）它的头部即可得分——普通棕色地鼠 +10 分，戴金色头盔的地鼠 +30 分。如果点到空无一物的洞口不扣分但也不得分。计时结束后显示本局得分和最高分记录。小技巧：把鼠标停在中心区域不要来回大幅移动，用小幅度滑动手腕覆盖附近几个洞口效率最高。',
  },
  {
    id: 'match-three',
    name: '消消乐',
    description: '8×8 的棋盘上布满五颜六色的宝石方块。你需要交换相邻两颗宝石的位置，使得横排或竖排出现至少三颗同色宝石相连，它们就会"叮"一声消除，上方宝石落下填充空隙，新的宝石从顶部生成。一次消除 4 颗同色产生条纹宝石（消除整行/列），5 颗产生彩虹宝石（消除全屏同色）。连锁消除触发 combo 连击，得分成倍增加。',
    category: '益智',
    icon: '💎',
    color: 'from-red-500 to-orange-500',
    component: 'MatchThree',
    players: 4567,
    rating: 4.9,
    instructions: '点击棋盘上任意一颗宝石选中它（宝石会有放大闪烁动画），再点击其上下左右相邻的任意一颗宝石，两颗宝石交换位置。如果交换后形成横向或纵向 3 颗及以上同色连线，连线部分消除并得分；如果交换后没有形成有效连线，两颗宝石弹回原位，不扣分。消除 4 颗同色生成条纹宝石，消除时触发整行或整列清空。消除 5 颗同色生成彩虹宝石，与任意颜色相邻宝石交换即可清空全屏该色宝石。右上角显示步数和目标分数，达到目标分即过关。',
  },
  {
    id: 'speed-racer',
    name: '极速赛车',
    description: '驾驶赛车在笔直的三车道高速公路上疾驰，前方不断有慢速车辆出现挡住去路。你需要灵活切换车道穿梭于车流之间，同时尽可能贴近其他车辆超车获取额外加分。速度会随着行驶距离持续提升，从悠闲巡航到极限狂飙，一旦撞上前方车辆车毁人亡。',
    category: '动作',
    icon: '🏎️',
    color: 'from-red-600 to-orange-600',
    component: 'SpeedRacer',
    players: 2876,
    rating: 4.6,
    instructions: '← 和 → 方向键（或触屏左右滑动）将赛车切换到左车道或右车道，每次切换一个车道。赛车自动向前行驶，前方会随机出现在不同车道上的慢速车辆（轿车、卡车等），你需要提前判断并变道躲避。从紧邻其他车辆旁边经过（间距极小但未碰撞）判定为"惊险超车"，额外加分并显示 COOL 提示。速度条在屏幕顶部显示，随行驶距离逐渐增加。撞到前方任何车辆立刻游戏结束，屏幕显示本次行驶距离和最高纪录。',
  },
  {
    id: 'bubble-shooter',
    name: '泡泡龙',
    description: '屏幕顶部悬垂着一大片五颜六色的泡泡群，底部有一门泡泡发射器。你用发射器瞄准上方同色泡泡，发射新泡泡去触碰它们——当 3 个及以上同色泡泡相连时，它们会啪地炸裂消除。如果射出的泡泡没有形成消除，它会粘在顶部泡泡群上，让泡泡群持续向下生长。泡泡群一旦越过底部警戒线即为失败。',
    category: '益智',
    icon: '🫧',
    color: 'from-blue-400 to-purple-500',
    component: 'BubbleShooter',
    players: 1987,
    rating: 4.5,
    instructions: '移动鼠标（或手指滑动）左右调整发射器的瞄准方向，屏幕会显示虚线辅助线指示弹道路径。点击鼠标左键（或轻触屏幕）发射当前炮弹泡泡。泡泡碰到顶部墙壁或已有泡泡后停止，如果该位置与同色泡泡形成 3 颗及以上连通，所有连通的同色泡泡一起消除。悬挂在消除泡泡下方、不再与顶部相连的泡泡也会整体掉落消除，掉落消除同样计分。发射器旁边预览下一个泡泡的颜色，方便提前规划。顶部泡泡群每降低一行，警戒线警告愈发紧迫。',
  },
  {
    id: 'sliding-puzzle',
    name: '数字华容道',
    description: '一个 4×4 共 16 格的方格盘，其中 15 个格子放着数字 1 到 15，1 个格子为空。数字初始顺序被打乱，你需要通过滑动相邻数字填入空格的方式，一步步将所有数字恢复为从上到下、从左到右 1-15 的正确顺序排列。看似简单，实则极度考验耐心和逻辑规划能力。',
    category: '益智',
    icon: '🔢',
    color: 'from-blue-600 to-indigo-600',
    component: 'SlidingPuzzle',
    players: 1654,
    rating: 4.3,
    instructions: '点击空格上下左右相邻的任意一个数字方块，该方块会滑入空格位置，原来方块所在位置变成新的空格。只能点击与空格相邻的方块（上下左右四个方向），对角方块和对角之外的方块无法直接移动，需要规划多步迂回。顶部显示当前步数和最低步数记录。当数字按 1、2、3、4 在第一行，5、6、7、8 在第二行，9、10、11、12 在第三行，13、14、15 在第四行排列时即为通关。小技巧：先拼好第一行和第一列，再处理中间的 2×2 和 3×3，最后右下角的 2×2 旋转几次就能解开。',
  },
  {
    id: 'jump-adventure',
    name: '跳一跳',
    description: '一个小方块站在平台上，前方是下一个平台。你需要按住蓄力、松开跳跃，让方块精准落在下一个平台上。平台之间的距离和大小各不相同——有的近在咫尺只许轻跳，有的远在天边需要蓄满力量。落在平台正中心有完美加成，落在边缘摇摇欲坠，落空则坠入深渊。每跳一步分数 +1，距离把控是唯一的关键。',
    category: '动作',
    icon: '🦘',
    color: 'from-teal-400 to-green-500',
    component: 'JumpAdventure',
    players: 3120,
    rating: 4.7,
    instructions: '按住鼠标左键不放（或手指按住屏幕不放），小方块会开始下蹲蓄力，屏幕上出现一个动态伸缩的力量条——蓄力越久条越长，松开时跳跃距离越远。松开鼠标/手指，小方块以抛物线轨迹跳出。如果落在下一个平台的正中心区域（约平台宽度的中间 20%），触发"完美着陆"，额外 +2 分并伴有特效。如果落在平台边缘之外则坠入深渊，游戏结束，屏幕显示本次得分和最高纪录。小技巧：前几个平台间距差不多，注意观察力量条的长度与平台间距的对应关系，掌握了手感就能跳很远。',
  },
  {
    id: 'archery-master',
    name: '射箭大师',
    description: '站在弓箭位上，前方一定距离处悬挂着圆形标靶。你需要拉弓、瞄准、放箭，让箭矢正中靶心。靶子分为 10 环，从外圈 1 分到正中心的 10 分——越靠近靶心分数越高。风向会随机改变，影响箭矢飞行轨迹，需要根据风向标调整瞄准点。10 支箭为一局，总分最高者为胜。',
    category: '休闲',
    icon: '🏹',
    color: 'from-amber-600 to-yellow-500',
    component: 'ArcheryMaster',
    players: 1432,
    rating: 4.4,
    instructions: '按住鼠标左键（或手指按住屏幕）开始拉弓，屏幕上的弓弦和力量条会逐渐向后拉伸——蓄力越久射得越远力道越大，但蓄满后弓身开始抖动，命中精度降低。松开鼠标/手指释放箭矢，箭矢飞向靶子。屏幕左上角有风向标和风速指示——风从左边吹来箭头偏右，从右边吹来箭头偏左，需要根据风力大小反向偏移瞄准。每支箭命中后靶子上显示该箭得分（1-10），右上角显示已射箭数和累计总分。10 支箭全部射出后显示总分评级：90 分以上 S 级，80-89 分 A 级。',
  },
  {
    id: 'guandan',
    name: '掼蛋',
    description: '四人两两组队的升级制扑克牌游戏，使用两副共 108 张扑克牌（含大小王各两张）。你和对面坐着的 AI 是队友，另外两家 AI 是对手。从 2 开始打，每一局赢家升一级（2→3→4...→A）。牌型丰富多样，既有常规的单张对子顺子，也有炸弹、同花顺、火箭等压制利器。炸弹可以压制普通牌型，更大的炸弹可以压制小炸弹，配牌出牌的策略深度极高。',
    category: '策略',
    icon: '🃏',
    color: 'from-red-600 to-orange-500',
    component: 'GuandanGame',
    players: 5680,
    rating: 4.8,
    instructions: '四人围坐，你和对面的 AI 为队友（东西阵营），另外两家 AI 为对手（南北阵营）。发牌后每轮由上一轮的胜出者先出牌（第一局随机指定），按逆时针方向轮流出牌。你可以选择出比上家更大的同类型牌型，也可以选择"过牌"不出。当其他三人连续过牌后，最后出牌者获得下一轮的出牌权。支持全部牌型：单张、对子、三同张（3 张相同）、三带二（3 张 + 任意对子）、顺子（5 张连续单牌）、钢板（连续两个三同张）、夯（连续三个对子）、普通炸弹（4 张相同）、同花顺（5 张同花色连续牌）、火箭（4 张王）。炸弹可以压制任何非炸弹牌型，更大的炸弹压制小炸弹。一方两人全部出完手中的牌即为获胜，获胜方下一局升级，升到 A 后再次获胜即赢得整场游戏。',
  },
];

const categories = ['全部', '休闲', '益智', '动作', '策略'];

const OnlineGamesPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';

  // 在线游戏 FAQ 结构化数据
  const structuredData = [
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': 'https://www.gghubs.com' },
        { '@type': 'ListItem', 'position': 2, 'name': '在线游戏', 'item': `${siteUrl}/${currentLang}/library/online` },
      ],
    },
    {
      '@type': 'ItemList',
      'name': '免费在线小游戏合集',
      'description': 'GameHub提供20+款免费在线小游戏',
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
          'name': '这些在线游戏需要下载吗？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '完全不需要！所有游戏都在浏览器中直接运行，点击即可开始游玩，无需任何下载或安装。',
          },
        },
        {
          '@type': 'Question',
          'name': '在线游戏是免费的吗？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '是的，GameHub上的所有在线小游戏完全免费，无需付费即可畅玩全部游戏。',
          },
        },
        {
          '@type': 'Question',
          'name': '可以在手机上玩这些游戏吗？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '可以！所有游戏都针对电脑和手机浏览器进行了适配优化，随时随地即可开始游戏。',
          },
        },
        {
          '@type': 'Question',
          'name': '需要注册账号才能玩吗？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '不需要注册，所有游戏无需登录即可直接游玩。注册账号后可以保存游戏进度和参与社区讨论。',
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
    if (selectedCategory !== '全部') {
      result = result.filter(g => g.category === selectedCategory);
    }
    return result;
  }, [searchText, selectedCategory]);

  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGames.slice(start, start + pageSize);
  }, [filteredGames, currentPage]);

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO
        title="免费在线小游戏 - 即点即玩无需下载 | GameHub"
        description="GameHub 提供20+款免费在线小游戏，包括贪吃蛇、俄罗斯方块、2048、五子棋、扫雷等经典游戏。无需下载，在浏览器中即点即玩，支持电脑和手机。"
        keywords="在线游戏, 免费小游戏, 网页游戏, 贪吃蛇, 俄罗斯方块, 2048, 五子棋, 扫雷, HTML5游戏, 浏览器游戏, 即点即玩, 无需下载"
        structuredData={structuredData}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
        <div className="">
          <div className="text-center">
            <Title level={1} className="!text-white mb-4">在线游戏</Title>
            <Paragraph className="!text-indigo-100 !text-lg mb-8">无需下载，即点即玩</Paragraph>
            <div className="max-w-xl mx-auto">
              <Input
                size="large"
                placeholder="搜索游戏..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="py-8">
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
            <Title level={3} className="!text-gray-400">没有找到匹配的游戏</Title>
            <Paragraph className="!text-gray-500">试试其他关键词或分类</Paragraph>
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
