/**
 * ConfigPanel - 3D 角色配置面板组件
 *
 * 提供角色全部可调参数的 UI 控制：
 * - 角色名称、类型（人物/动物）
 * - 身高、体型（仅动物）
 * - 肤色、发型、发色、眼睛、嘴巴、鼻子、耳朵
 * - 换装（上衣、下装、鞋子、配件）
 * - 姿势切换
 * - AI 描述生成、保存、STL 导出等操作按钮
 */
import React from 'react';
import { Card, Input, Select, Slider, Button, Row, Col, Typography, Divider, Tooltip } from 'antd';
import { UserOutlined, SaveOutlined, ThunderboltOutlined, PrinterOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import {
  CharacterConfig, CharacterType, AnimalType,
  BodyProportions, ClothingConfig, FaceConfig, HairConfig,
  SKIN_TONES, HAIR_COLORS, EYE_COLORS,
  HAIR_STYLE_LABELS, EYE_STYLE_LABELS, MOUTH_STYLE_LABELS,
  HUMAN_POSE_LABELS, ANIMAL_POSE_LABELS,
  CLOTHING_TOP_OPTIONS, CLOTHING_BOTTOM_OPTIONS, CLOTHING_SHOES_OPTIONS, ACCESSORY_OPTIONS,
  HairStyle, EyeStyle, MouthStyle,
} from './types';

const { Text } = Typography;

/** ConfigPanel 组件的属性接口 */
interface ConfigPanelProps {
  config: CharacterConfig;                   // 当前角色配置
  onChange: (config: CharacterConfig) => void; // 配置变更回调
  onGenerateDescription: () => void;          // AI 描述生成回调
  onSave: () => void;                         // 保存回调
  onExportSTL: () => void;                    // STL 导出回调
  isGenerating?: boolean;                     // 是否正在生成 AI 描述
}

/**
 * ConfigPanel 主组件
 * 渲染所有角色配置控件，通过局部更新函数修改配置对象的特定部分
 */
const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config, onChange, onGenerateDescription, onSave, onExportSTL, isGenerating,
}) => {
  /** 更新角色配置的顶层字段 */
  const update = (partial: Partial<CharacterConfig>) => {
    onChange({ ...config, ...partial });
  };

  /** 更新体型配置子字段 */
  const updateBody = (partial: Partial<BodyProportions>) => {
    onChange({ ...config, body: { ...config.body, ...partial } });
  };

  /** 更新发型配置子字段 */
  const updateHair = (partial: Partial<HairConfig>) => {
    onChange({ ...config, hair: { ...config.hair, ...partial } });
  };

  /** 更新服装配置子字段 */
  const updateClothing = (partial: Partial<ClothingConfig>) => {
    onChange({ ...config, clothing: { ...config.clothing, ...partial } });
  };

  /** 更新面部配置子字段 */
  const updateFace = (partial: Partial<FaceConfig>) => {
    onChange({ ...config, face: { ...config.face, ...partial } });
  };

  const isAnimal = config.type === 'animal';
  const poseLabels = isAnimal ? ANIMAL_POSE_LABELS : HUMAN_POSE_LABELS;

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
      {/* 角色名称 */}
      <div>
        <Text className="block mb-1 text-sm">角色名称</Text>
        <Input
          className="max-w-[60%]"
          placeholder="输入角色名称"
          value={config.name}
          onChange={(e) => update({ name: e.target.value })}
          prefix={<UserOutlined />}
          size="small"
        />
      </div>

      <Divider className="!my-3" />

      {/* 类型选择 */}
      <div>
        <Text className="block mb-1 text-sm">角色类型</Text>
        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              type={!isAnimal ? 'primary' : 'default'}
              size="small"
              onClick={() => update({ type: 'human' })}
            >
              🧑 人物
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              type={isAnimal ? 'primary' : 'default'}
              size="small"
              onClick={() => update({ type: 'animal', animalType: 'cat' })}
            >
              🐾 动物
            </Button>
          </motion.div>
        </div>
        {isAnimal && (
          <Select
            className="mt-2"
            size="small"
            value={config.animalType || 'cat'}
            onChange={(val: AnimalType) => update({ animalType: val })}
            style={{ width: 120 }}
            options={[
              { value: 'cat', label: '🐱 猫' },
              { value: 'dog', label: '🐶 狗' },
              { value: 'rabbit', label: '🐰 兔子' },
              { value: 'bear', label: '🐻 熊' },
            ]}
          />
        )}
      </div>

      <Divider className="!my-3" />

      {/* 高度控制 */}
      <div>
        <Text className="block mb-1 text-sm">身高: {config.body.height.toFixed(1)}x</Text>
        <Slider
          min={0.5}
          max={2.0}
          step={0.1}
          value={config.body.height}
          onChange={(v) => updateBody({ height: v })}
        />
      </div>

      {/* 体型宽度 — 仅对动物(原始几何体)生效, 人体 GLTF 模型固定 */}
      {isAnimal && (
        <div>
          <Text className="block mb-1 text-sm">体型宽度: {config.body.width.toFixed(1)}x</Text>
          <Slider
            min={0.5}
            max={1.8}
            step={0.1}
            value={config.body.width}
            onChange={(v) => updateBody({ width: v })}
          />
        </div>
      )}

      {/* 头部大小 — 仅对动物生效 */}
      {isAnimal && (
        <div>
          <Text className="block mb-1 text-sm">头部大小: {config.body.headSize.toFixed(1)}x</Text>
          <Slider
            min={0.6}
            max={1.8}
            step={0.1}
            value={config.body.headSize}
            onChange={(v) => updateBody({ headSize: v })}
          />
        </div>
      )}

      <Divider className="!my-3" />

      {/* 肤色 */}
      <div>
        <Text className="block mb-1 text-sm">肤色</Text>
        <div className="flex gap-1.5">
          {SKIN_TONES.map((tone) => (
            <motion.div
              key={tone}
              whileHover={{ scale: 1.2 }}
              className={`w-6 h-6 rounded-full cursor-pointer border-2 ${config.face.skinTone === tone ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
              style={{ backgroundColor: tone }}
              onClick={() => updateFace({ skinTone: tone })}
            />
          ))}
        </div>
      </div>

      {/* 发型 */}
      <div>
        <Text className="block mb-1 text-sm">发型</Text>
        <Select
          size="small"
          value={config.hair.style}
          onChange={(val: HairStyle) => updateHair({ style: val })}
          style={{ width: 120 }}
          options={Object.entries(HAIR_STYLE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {/* 发色 */}
      {config.hair.style !== 'bald' && (
        <div>
          <Text className="block mb-1 text-sm">发色</Text>
          <div className="flex gap-1.5">
            {HAIR_COLORS.map((color) => (
              <motion.div
                key={color}
                whileHover={{ scale: 1.2 }}
                className={`w-6 h-6 rounded-full cursor-pointer border-2 ${config.hair.color === color ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                onClick={() => updateHair({ color })}
              />
            ))}
          </div>
        </div>
      )}

      <Divider className="!my-3" />

      {/* 眼睛 */}
      <div>
        <Text className="block mb-1 text-sm">眼睛</Text>
        <Select
          size="small"
          value={config.face.eyeStyle}
          onChange={(val: EyeStyle) => updateFace({ eyeStyle: val })}
          style={{ width: 130 }}
          options={Object.entries(EYE_STYLE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {/* 眼睛颜色 */}
      {config.face.eyeStyle !== 'sunglasses' && (
        <div className="mt-1">
          <Text className="block mb-1 text-sm">眼色</Text>
          <div className="flex gap-1.5">
            {EYE_COLORS.map((color) => (
              <motion.div
                key={color}
                whileHover={{ scale: 1.2 }}
                className={`w-5 h-5 rounded-full cursor-pointer border-2 ${config.face.eyeColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                onClick={() => updateFace({ eyeColor: color })}
              />
            ))}
          </div>
        </div>
      )}

      {/* 嘴巴 */}
      <div className="mt-2">
        <Text className="block mb-1 text-sm">嘴巴</Text>
        <Select
          size="small"
          value={config.face.mouthStyle}
          onChange={(val: MouthStyle) => updateFace({ mouthStyle: val })}
          style={{ width: 130 }}
          options={Object.entries(MOUTH_STYLE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {/* 鼻子大小 — 人类/动物都生效 */}
      <div className="mt-2">
        <Text className="block mb-1 text-sm">鼻子大小: {(config.face.noseSize).toFixed(1)}x</Text>
        <Slider
          min={0.5}
          max={1.5}
          step={0.1}
          value={config.face.noseSize}
          onChange={(v) => updateFace({ noseSize: v })}
        />
      </div>

      {/* 耳朵大小 — 人类/动物都生效 */}
      <div className="mt-2">
        <Text className="block mb-1 text-sm">耳朵大小: {(config.face.earSize).toFixed(1)}x</Text>
        <Slider
          min={0.5}
          max={1.5}
          step={0.1}
          value={config.face.earSize}
          onChange={(v) => updateFace({ earSize: v })}
        />
      </div>

      <Divider className="!my-3" />

      {/* 换装 */}
      <div>
        <Text className="block mb-1 text-sm">上衣</Text>
        <Select
          size="small"
          value={config.clothing.top}
          onChange={(val: string) => updateClothing({ top: val })}
          style={{ width: 120 }}
          options={CLOTHING_TOP_OPTIONS}
        />
      </div>
      {config.clothing.top !== 'none' && (
        <div className="mt-1">
          <Text className="block mb-1 text-xs">上衣颜色</Text>
          <input
            type="color"
            value={config.clothing.topColor}
            onChange={(e) => updateClothing({ topColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border-0"
          />
        </div>
      )}

      {!isAnimal && (
        <>
          <div className="mt-2">
            <Text className="block mb-1 text-sm">下装</Text>
            <Select
              size="small"
              value={config.clothing.bottom}
              onChange={(val: string) => updateClothing({ bottom: val })}
              style={{ width: 120 }}
              options={CLOTHING_BOTTOM_OPTIONS}
            />
          </div>
          <div className="mt-2">
            <Text className="block mb-1 text-sm">鞋子</Text>
            <Select
              size="small"
              value={config.clothing.shoes}
              onChange={(val: string) => updateClothing({ shoes: val })}
              style={{ width: 120 }}
              options={CLOTHING_SHOES_OPTIONS}
            />
          </div>
        </>
      )}

      {/* 配件 */}
      <div className="mt-2">
        <Text className="block mb-1 text-sm">配件</Text>
        <Select
          size="small"
          value={config.clothing.accessory}
          onChange={(val: string) => updateClothing({ accessory: val })}
          style={{ width: 120 }}
          options={ACCESSORY_OPTIONS}
        />
      </div>

      <Divider className="!my-3" />

      {/* 姿势 */}
      <div>
        <Text className="block mb-1 text-sm">姿势</Text>
        <div className="flex flex-wrap gap-1">
          {Object.entries(poseLabels).map(([value, label]) => (
            <Button
              key={value}
              size="small"
              type={config.pose === value ? 'primary' : 'default'}
              onClick={() => update({ pose: value as any })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Divider className="!my-3" />

      {/* 操作按钮 */}
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Button
            block
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={onGenerateDescription}
            loading={isGenerating}
          >
            AI 描述
          </Button>
        </Col>
        <Col span={12}>
          <Button
            block
            size="small"
            icon={<SaveOutlined />}
            onClick={onSave}
          >
            保存
          </Button>
        </Col>
        <Col span={24}>
          <Tooltip title="导出 STL 文件用于 3D 打印">
            <Button
              block
              size="small"
              icon={<PrinterOutlined />}
              onClick={onExportSTL}
            >
              3D 打印导出
            </Button>
          </Tooltip>
        </Col>
      </Row>
    </div>
  );
};

export default ConfigPanel;
