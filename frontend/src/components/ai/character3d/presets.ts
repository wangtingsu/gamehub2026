/**
 * presets - 角色预设配置列表
 *
 * 提供一组预定义的角色模板，用户可一键应用：
 * - 战士（人类）：高大体型、铠甲、莫西干发型、佩剑
 * - 法师（人类）：长袍、长发、法杖
 * - 弓箭手（人类）：轻甲、马尾、弓箭
 * - 猫咪（动物）：橘猫坐姿
 * - 狗狗（动物）：柴犬站立
 * - 兔子（动物）：小白兔坐姿
 */
import { CharacterConfig, createDefaultCharacterConfig, createDefaultAnimalConfig } from './types';

/** 预设项的数据结构 */
export interface PresetItem {
  id: string;                              // 预设唯一标识
  label: string;                           // 中文标签
  icon: string;                            // 图标 emoji
  color: string;                           // 主题色
  getConfig: () => CharacterConfig;        // 获取预设的角色配置
}

/** 预设列表 */
export const PRESETS: PresetItem[] = [
  {
    id: 'warrior',
    label: '战士',
    icon: '⚔️',
    color: '#ff4d4f',
    getConfig: () => ({
      ...createDefaultCharacterConfig({ name: '战士' }),
      body: { height: 1.2, headSize: 0.9, armLength: 1.1, legLength: 1.1, width: 1.2 },
      hair: { style: 'mohawk', color: '#8b0000' },
      clothing: { top: 'armor', bottom: 'pants', shoes: 'boots', topColor: '#cc4444', bottomColor: '#444', shoesColor: '#8B4513', accessory: 'sword' },
      face: { skinTone: '#deb887', eyeStyle: 'almond', eyeColor: '#3a281a', mouthStyle: 'smirk', noseSize: 1, earSize: 0.8 },
      pose: 'standing',
    }),
  },
  {
    id: 'mage',
    label: '法师',
    icon: '🔮',
    color: '#722ed1',
    getConfig: () => ({
      ...createDefaultCharacterConfig({ name: '法师' }),
      body: { height: 1.0, headSize: 1.1, armLength: 1.0, legLength: 1.0, width: 0.85 },
      hair: { style: 'long', color: '#4a3728' },
      clothing: { top: 'robe', bottom: 'pants', shoes: 'sandals', topColor: '#6a0dad', bottomColor: '#2d004d', shoesColor: '#8B4513', accessory: 'cape' },
      face: { skinTone: '#fce4c8', eyeStyle: 'sparkle', eyeColor: '#2e5a8a', mouthStyle: 'calm', noseSize: 0.8, earSize: 1 },
      pose: 'standing',
    }),
  },
  {
    id: 'archer',
    label: '弓箭手',
    icon: '🏹',
    color: '#52c41a',
    getConfig: () => ({
      ...createDefaultCharacterConfig({ name: '弓箭手' }),
      body: { height: 1.0, headSize: 0.9, armLength: 1.05, legLength: 1.05, width: 0.9 },
      hair: { style: 'ponytail', color: '#d4a017' },
      clothing: { top: 'jacket', bottom: 'pants', shoes: 'boots', topColor: '#2e7d32', bottomColor: '#3a3a3a', shoesColor: '#5D4037', accessory: 'none' },
      face: { skinTone: '#f0c8a0', eyeStyle: 'round', eyeColor: '#4a7a2e', mouthStyle: 'smile', noseSize: 0.9, earSize: 0.9 },
      pose: 'standing',
    }),
  },
  {
    id: 'cat',
    label: '猫咪',
    icon: '🐱',
    color: '#ff8c00',
    getConfig: () => ({
      ...createDefaultAnimalConfig('cat'),
      name: '橘猫',
      body: { height: 0.8, headSize: 1.3, armLength: 1, legLength: 1, width: 1.1 },
      face: { skinTone: '#ff8c00', eyeStyle: 'large', eyeColor: '#4a7a2e', mouthStyle: 'smile', noseSize: 0.6, earSize: 1.4 },
      pose: 'sit',
    }),
  },
  {
    id: 'dog',
    label: '狗狗',
    icon: '🐶',
    color: '#c8a882',
    getConfig: () => ({
      ...createDefaultAnimalConfig('dog'),
      name: '柴犬',
      body: { height: 0.9, headSize: 1.1, armLength: 1, legLength: 1, width: 1.0 },
      face: { skinTone: '#c8a882', eyeStyle: 'large', eyeColor: '#3a281a', mouthStyle: 'bigSmile', noseSize: 0.7, earSize: 0.8 },
      pose: 'stand',
    }),
  },
  {
    id: 'rabbit',
    label: '兔子',
    icon: '🐰',
    color: '#ffb6c1',
    getConfig: () => ({
      ...createDefaultAnimalConfig('rabbit'),
      name: '小白兔',
      body: { height: 0.7, headSize: 1.4, armLength: 1, legLength: 1, width: 0.8 },
      face: { skinTone: '#f5f5f5', eyeStyle: 'large', eyeColor: '#ff69b4', mouthStyle: 'smile', noseSize: 0.5, earSize: 1.8 },
      pose: 'sit',
    }),
  },
];
