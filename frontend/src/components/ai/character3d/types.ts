// ====== 3D 角色捏脸系统类型定义 ======

/** 角色大类：人物或动物 */
export type CharacterType = 'human' | 'animal';
/** 动物子类型 */
export type AnimalType = 'cat' | 'dog' | 'rabbit' | 'bear';

/** 发型枚举 */
export type HairStyle = 'short' | 'long' | 'ponytail' | 'curly' | 'bald' | 'mohawk';
/** 眼睛样式枚举 */
export type EyeStyle = 'round' | 'sunglasses' | 'large' | 'sparkle' | 'almond' | 'sleepy';
/** 嘴巴样式枚举 */
export type MouthStyle = 'smile' | 'bigSmile' | 'laugh' | 'calm' | 'think' | 'smirk';
/** 人物姿势枚举 */
export type HumanPose = 'standing' | 'walking' | 'wave' | 'sit' | 'jump' | 'victory';
/** 动物姿势枚举 */
export type AnimalPose = 'stand' | 'sit' | 'lie' | 'wagTail';

/** 身体比例配置（所有值均为倍率系数） */
export interface BodyProportions {
  height: number;       // 身高倍率 0.5 ~ 2.0
  headSize: number;     // 头部大小倍率 0.8 ~ 1.5
  armLength: number;    // 手臂长度倍率 0.8 ~ 1.2
  legLength: number;    // 腿长倍率 0.8 ~ 1.2
  width: number;        // 身体宽度倍率 0.7 ~ 1.5
}

/** 服装配置 */
export interface ClothingConfig {
  top: string;          // 上衣：'none' | 'tshirt' | 'armor' | 'robe' | 'jacket'
  bottom: string;       // 下装：'none' | 'pants' | 'skirt' | 'shorts'
  shoes: string;        // 鞋子：'none' | 'sneakers' | 'boots' | 'sandals'
  topColor: string;     // 上衣颜色（十六进制）
  bottomColor: string;  // 下装颜色
  shoesColor: string;   // 鞋子颜色
  accessory: string;    // 配件：'none' | 'hat' | 'glasses' | 'cape' | 'sword'
}

/** 面部特征配置 */
export interface FaceConfig {
  skinTone: string;      // 肤色（十六进制色值）
  eyeStyle: EyeStyle;    // 眼睛样式
  eyeColor: string;      // 眼睛颜色
  mouthStyle: MouthStyle; // 嘴巴样式
  noseSize: number;      // 鼻子大小倍率 0.5 ~ 1.5
  earSize: number;       // 耳朵大小倍率 0.5 ~ 1.5
}

/** 发型配置 */
export interface HairConfig {
  style: HairStyle;  // 发型
  color: string;     // 发色（十六进制）
}

/** 完整角色配置 */
export interface CharacterConfig {
  id: string;                // 唯一标识
  name: string;              // 角色名称
  type: CharacterType;       // 角色类型
  animalType?: AnimalType;   // 动物子类型（仅 type='animal' 时有效）
  body: BodyProportions;     // 身体比例
  hair: HairConfig;           // 发型
  clothing: ClothingConfig;   // 服装
  face: FaceConfig;           // 面部特征
  pose: HumanPose | AnimalPose; // 当前姿势
  presetId?: string;          // 预设 ID（如果是从预设创建的）
  /** 外部加载的 GLB 模型 URL（如图转 3D 生成的模型） */
  modelUrl?: string;
  /** 外部 3D 生成服务的任务 ID */
  modelTaskId?: string;
}

/** 场景中的角色实例（包含配置 + 位置旋转信息） */
export interface SceneCharacter {
  characterConfig: CharacterConfig;                   // 角色配置
  position: { x: number; y: number; z: number };      // 场景中的位置
  rotation: { x: number; y: number; z: number };      // 旋转角度（弧度）
}

/** 完整场景配置（用于持久化保存/加载） */
export interface SceneConfig {
  id: string;                        // 场景唯一标识
  name: string;                      // 场景名称
  characters: SceneCharacter[];      // 角色实例列表
  layout: 'row' | 'arc' | 'free';   // 布局模式
  createdAt: string;                 // 创建时间 ISO 字符串
  updatedAt: string;                 // 更新时间 ISO 字符串
}

// 默认配置常量
export const DEFAULT_SKIN_TONE = '#fce4c8';
export const DEFAULT_HAIR_COLOR = '#1a1a1a';
export const DEFAULT_EYE_COLOR = '#3a281a';

export const SKIN_TONES = ['#fce4c8', '#f0c8a0', '#deb887', '#c68642', '#8d5524', '#3b2a1c'];
export const HAIR_COLORS = ['#1a1a1a', '#4a3728', '#d4a017', '#8b0000', '#ff69b4', '#00ced1'];
export const EYE_COLORS = ['#3a281a', '#4a7a2e', '#2e5a8a', '#8a2e5a', '#8a7a2e'];

export const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  short: '短发', long: '长发', ponytail: '马尾', curly: '卷发', bald: '光头', mohawk: '莫西干',
};

export const EYE_STYLE_LABELS: Record<EyeStyle, string> = {
  round: '圆眼', sunglasses: '墨镜', large: '大眼', sparkle: '星星眼', almond: '杏眼', sleepy: '睡眼',
};

export const MOUTH_STYLE_LABELS: Record<MouthStyle, string> = {
  smile: '微笑', bigSmile: '大笑', laugh: '张嘴笑', calm: '平静', think: '思考', smirk: '歪嘴',
};

export const HUMAN_POSE_LABELS: Record<HumanPose, string> = {
  standing: '站立', walking: '行走', wave: '挥手', sit: '坐下', jump: '跳跃', victory: '胜利',
};

export const ANIMAL_POSE_LABELS: Record<AnimalPose, string> = {
  stand: '站立', sit: '坐姿', lie: '趴下', wagTail: '摇尾巴',
};

export const CLOTHING_TOP_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'tshirt', label: 'T恤' },
  { value: 'armor', label: '铠甲' },
  { value: 'robe', label: '长袍' },
  { value: 'jacket', label: '夹克' },
];

export const CLOTHING_BOTTOM_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'pants', label: '裤子' },
  { value: 'skirt', label: '裙子' },
  { value: 'shorts', label: '短裤' },
];

export const CLOTHING_SHOES_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'sneakers', label: '运动鞋' },
  { value: 'boots', label: '靴子' },
  { value: 'sandals', label: '凉鞋' },
];

export const ACCESSORY_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'hat', label: '帽子' },
  { value: 'glasses', label: '眼镜' },
  { value: 'cape', label: '披风' },
  { value: 'sword', label: '剑' },
];

/**
 * 创建默认角色配置
 * @param overrides - 可选的覆盖字段，用于自定义初始角色的特定属性
 * @returns 完整的人物角色配置对象
 */
export function createDefaultCharacterConfig(overrides?: Partial<CharacterConfig>): CharacterConfig {
  return {
    id: `char_${Date.now()}`,
    name: '新角色',
    type: 'human',
    body: { height: 1, headSize: 1, armLength: 1, legLength: 1, width: 1 },
    hair: { style: 'short', color: DEFAULT_HAIR_COLOR },
    clothing: { top: 'tshirt', bottom: 'pants', shoes: 'sneakers', topColor: '#4a90d9', bottomColor: '#3a3a3a', shoesColor: '#ffffff', accessory: 'none' },
    face: { skinTone: DEFAULT_SKIN_TONE, eyeStyle: 'round', eyeColor: DEFAULT_EYE_COLOR, mouthStyle: 'smile', noseSize: 1, earSize: 1 },
    pose: 'standing',
    ...overrides,
  };
}

/**
 * 创建默认动物角色配置
 * @param animalType - 动物类型（默认 cat）
 * @returns 角色配置（动物的服装默认设为 none）
 */
export function createDefaultAnimalConfig(animalType: AnimalType = 'cat'): CharacterConfig {
  const base = createDefaultCharacterConfig({
    type: 'animal',
    animalType,
    name: animalType === 'cat' ? '小猫' : animalType === 'dog' ? '小狗' : animalType === 'rabbit' ? '小兔' : '小熊',
    pose: 'stand',
  });
  base.clothing.top = 'none';
  base.clothing.bottom = 'none';
  base.clothing.shoes = 'none';
  return base;
}

/**
 * 生成唯一标识符
 * @returns 格式为 "char_时间戳_随机字符串" 的 ID
 */
export function generateId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
