/**
 * AiAssistant - AI 助手主页面组件
 *
 * 作为 AI 功能的总入口，使用 Ant Design Tabs 组织四个子功能模块：
 * 1. 人物自画像（CharacterPortrait3D）- 3D 角色捏脸与展示
 * 2. 心灵驿站（SoulStation）- AI 情感交流聊天
 * 3. 游戏百科（GameNPC）- 游戏攻略、视频、二创搜索
 * 4. 命理师（GameCompanion）- 游戏角色性格测试与推荐
 */
import { Tabs } from 'antd';
import {
  UserOutlined, HeartOutlined, RobotOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import CharacterPortrait3D from './CharacterPortrait3D';
import SoulStation from './SoulStation';
import GameNPC from './GameNPC';
import GameCompanion from './GameCompanion';

/**
 * AI 助手主组件
 * 以标签页（Tabs）形式组织四个 AI 子功能，每个标签对应一个独立的功能模块。
 */
const AiAssistant: React.FC = () => {
  return (
    <div className="w-full">
      <Tabs
        defaultActiveKey="portrait"
        size="small"
        className="ai-assistant-tabs"
        items={[
          {
            key: 'portrait',
            label: (
              <span className="flex items-center gap-1">
                <UserOutlined />
                人物自画像
              </span>
            ),
            children: <CharacterPortrait3D />,
          },
          {
            key: 'soul',
            label: (
              <span className="flex items-center gap-1">
                <HeartOutlined />
                心灵驿站
              </span>
            ),
            children: <SoulStation />,
          },
          {
            key: 'npc',
            label: (
              <span className="flex items-center gap-1">
                <RobotOutlined />
                游戏百科
              </span>
            ),
            children: <GameNPC />,
          },
          {
            key: 'companion',
            label: (
              <span className="flex items-center gap-1">
                <ThunderboltOutlined />
                命理师
              </span>
            ),
            children: <GameCompanion />,
          },
        ]}
      />
    </div>
  );
};

export default AiAssistant;
