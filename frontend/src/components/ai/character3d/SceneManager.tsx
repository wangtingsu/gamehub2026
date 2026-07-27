/**
 * SceneManager - 3D 场景管理器组件
 *
 * 提供多角色场景的增删改查管理功能：
 * - 场景名称编辑
 * - 布局模式切换（一字/弧线/自由）
 * - 角色列表展示与选中
 * - 添加角色（新建人物/动物/预设）
 * - 复制/删除角色
 * - 清空场景
 */
import React, { useState } from 'react';
import {
  Button, Select, Typography, Popconfirm, Dropdown, Space, Tag, Input,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, CopyOutlined, ClearOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneCharacter, CharacterConfig, createDefaultCharacterConfig, createDefaultAnimalConfig } from './types';
import { PRESETS } from './presets';
import type { LayoutMode } from './SceneStore';

const { Text } = Typography;

/** SceneManager 组件的属性接口 */
interface SceneManagerProps {
  characters: SceneCharacter[];                         // 场景中的角色列表
  selectedCharacterId: string | null;                   // 当前选中的角色 ID
  layout: LayoutMode;                                   // 当前布局模式
  sceneName: string;                                    // 场景名称
  onSelectCharacter: (id: string | null) => void;       // 选中角色回调
  onAddCharacter: (config: CharacterConfig) => void;    // 添加角色回调
  onRemoveCharacter: (id: string) => void;               // 删除角色回调
  onDuplicateCharacter: (id: string) => void;            // 复制角色回调
  onClearScene: () => void;                              // 清空场景回调
  onSetLayout: (layout: LayoutMode) => void;             // 设置布局回调
  onSetSceneName: (name: string) => void;                // 设置场景名称回调
}

/**
 * SceneManager 主组件
 * 渲染场景管理面板，支持场景命名、布局切换和角色列表管理
 */
const SceneManager: React.FC<SceneManagerProps> = ({
  characters, selectedCharacterId, layout, sceneName,
  onSelectCharacter, onAddCharacter, onRemoveCharacter,
  onDuplicateCharacter, onClearScene, onSetLayout, onSetSceneName,
}) => {
  const [addOpen, setAddOpen] = useState(false); // 添加角色下拉菜单是否展开

  /**
   * 添加新的默认角色（人物或动物）
   * @param type - 角色类型
   */
  const handleAddNew = (type: 'human' | 'animal') => {
    const config = type === 'human'
      ? createDefaultCharacterConfig({ name: `角色 ${characters.length + 1}` })
      : createDefaultAnimalConfig('cat');
    config.id = `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    config.name = type === 'human' ? `角色 ${characters.length + 1}` : '小动物';
    onAddCharacter(config);
    setAddOpen(false);
  };

  /**
   * 从预设添加角色
   * @param presetId - 预设 ID
   */
  const handleAddPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const config = preset.getConfig();
      config.id = `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      config.name = `${preset.label} ${characters.length + 1}`;
      onAddCharacter(config);
    }
    setAddOpen(false);
  };

  const addItems = [
    {
      key: 'human',
      label: '🧑 新建人物',
      onClick: () => handleAddNew('human'),
    },
    {
      key: 'animal',
      label: '🐾 新建动物',
      onClick: () => handleAddNew('animal'),
    },
    { type: 'divider' as const },
    ...PRESETS.map((p) => ({
      key: p.id,
      label: `${p.icon} ${p.label}`,
      onClick: () => handleAddPreset(p.id),
    })),
  ];

  return (
    <div className="space-y-3">
      {/* Scene name */}
      <div>
        <Text className="block mb-1 text-xs text-gray-500">场景名称</Text>
        <Input
          size="small"
          value={sceneName}
          onChange={(e) => onSetSceneName(e.target.value)}
          placeholder="输入场景名称"
          className="max-w-[80%]"
        />
      </div>

      {/* Layout selector */}
      <div>
        <Text className="block mb-1 text-xs text-gray-500">布局模式</Text>
        <div className="flex gap-1">
          {([
            ['row', '一字排开'],
            ['arc', '弧线排列'],
            ['free', '自由'],
          ] as [LayoutMode, string][]).map(([val, label]) => (
            <Button
              key={val}
              size="small"
              type={layout === val ? 'primary' : 'default'}
              onClick={() => onSetLayout(val)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Character list */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Text className="text-xs text-gray-500">
            角色列表 ({characters.length})
          </Text>
          <Space size={4}>
            <Dropdown menu={{ items: addItems }} trigger={['click']}>
              <Button size="small" type="primary" icon={<PlusOutlined />}>
                添加
              </Button>
            </Dropdown>
            {characters.length > 0 && (
              <Popconfirm
                title="确定清空场景？"
                onConfirm={onClearScene}
                okText="确定"
                cancelText="取消"
              >
                <Button size="small" danger icon={<ClearOutlined />} />
              </Popconfirm>
            )}
          </Space>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          <AnimatePresence>
            {characters.map((sc) => {
              const cfg = sc.characterConfig;
              const isSelected = selectedCharacterId === cfg.id;
              return (
                <motion.div
                  key={cfg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => onSelectCharacter(cfg.id)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span>{cfg.type === 'animal' ? '🐾' : '🧑'}</span>
                      <span className="truncate max-w-[100px] text-xs font-medium">
                        {cfg.name}
                      </span>
                      {cfg.type === 'animal' && cfg.animalType && (
                        <Tag
                          color={
                            cfg.animalType === 'cat' ? 'orange' :
                            cfg.animalType === 'dog' ? 'gold' :
                            cfg.animalType === 'rabbit' ? 'pink' :
                            'brown'
                          }
                          className="!text-[10px] !px-1 !py-0 !leading-none"
                        >
                          {cfg.animalType === 'cat' ? '猫' :
                           cfg.animalType === 'dog' ? '狗' :
                           cfg.animalType === 'rabbit' ? '兔' : '熊'}
                        </Tag>
                      )}
                    </div>
                    <Space size={2} onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="small"
                        type="text"
                        icon={<CopyOutlined style={{ fontSize: 11 }} />}
                        onClick={() => onDuplicateCharacter(cfg.id)}
                        className="!text-gray-400 hover:!text-blue-500"
                      />
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                        onClick={() => onRemoveCharacter(cfg.id)}
                        className="!text-gray-400 hover:!text-red-500"
                      />
                    </Space>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SceneManager;
