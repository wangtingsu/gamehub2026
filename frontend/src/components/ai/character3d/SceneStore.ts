/**
 * SceneStore - 3D 场景状态管理（Zustand）
 *
 * 管理多角色 3D 场景的全局状态：
 * - 角色列表的增删改查
 * - 场景布局（一字/弧线/自由）
 * - 角色位置和旋转
 * - 预设角色添加
 * - 场景保存/加载
 *
 * 使用 Zustand 实现轻量级状态管理，无需 Provider 包裹
 */
import { create } from 'zustand';
import {
  CharacterConfig, SceneCharacter, SceneConfig,
  generateId, createDefaultCharacterConfig, createDefaultAnimalConfig,
} from './types';
import { PRESETS } from './presets';

/** 布局模式枚举 */
export type LayoutMode = 'row' | 'arc' | 'free';

/** SceneStore 接口定义：包含所有状态和操作方法 */
export interface SceneStore {
  // 状态
  characters: SceneCharacter[];            // 场景中的角色列表
  selectedCharacterId: string | null;      // 当前选中的角色 ID
  layout: LayoutMode;                      // 场景布局模式
  sceneName: string;                       // 场景名称

  // 角色操作
  addCharacter: (config: CharacterConfig) => void;
  removeCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => void;
  selectCharacter: (id: string | null) => void;
  updateCharacterConfig: (id: string, config: CharacterConfig) => void;
  updateCharacterPosition: (id: string, position: { x: number; y: number; z: number }) => void;
  updateCharacterRotation: (id: string, rotation: { x: number; y: number; z: number }) => void;
  clearScene: () => void;

  // 布局操作
  setLayout: (layout: LayoutMode) => void;
  setSceneName: (name: string) => void;

  // 预设
  applyPreset: (presetId: string) => void;

  // 持久化
  saveScene: () => SceneConfig;
  loadScene: (scene: SceneConfig) => void;
}

/**
 * 计算角色在场景中的位置偏移
 * 根据布局模式和角色索引自动分配位置：
 * - row（一字排开）：沿 X 轴等距排列
 * - arc（弧线排列）：沿弧线分布
 * - free（自由）：同 row 模式
 * @param index - 角色在列表中的索引
 * @param total - 角色总数
 * @param layout - 布局模式
 * @returns 位置坐标 { x, y, z }
 */
function calcPosition(
  index: number,
  total: number,
  layout: LayoutMode,
): { x: number; y: number; z: number } {
  const spacing = 1.8;
  switch (layout) {
    case 'row':
      return {
        x: (index - (total - 1) / 2) * spacing,
        y: 0,
        z: 0,
      };
    case 'arc': {
      const angle = ((index - (total - 1) / 2) / Math.max(total, 2)) * Math.PI * 0.5;
      return {
        x: Math.sin(angle) * spacing * 1.2,
        y: 0,
        z: -(Math.cos(angle) * spacing * 1.2 - spacing * 1.2),
      };
    }
    case 'free':
    default:
      return {
        x: (index - (total - 1) / 2) * spacing,
        y: 0,
        z: 0,
      };
  }
}

/**
 * 创建 Zustand 场景状态 store
 * 包含初始状态定义和所有操作方法实现
 */
export const useSceneStore = create<SceneStore>((set, get) => {
  // 创建初始角色时即设定 ID，用于初始化 selectedCharacterId
  const initialCharacter = createDefaultCharacterConfig({ name: '我的角色' });

  return {
    /* ====== 初始状态 ====== */
    characters: [
      {
        characterConfig: initialCharacter,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    ],
    // 初始状态直接选中第一个角色，避免 useEffect 延迟导致配置面板闪烁消失
    selectedCharacterId: initialCharacter.id,
    layout: 'row',
    sceneName: '新场景',

  /**
   * 添加角色到场景
   * 自动重新计算所有角色的位置以适应布局
   */
  addCharacter: (config) => {
    const state = get();
    const sc: SceneCharacter = {
      characterConfig: config,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    };
    const chars = [...state.characters, sc];
    // 重新计算所有角色的位置
    const total = chars.length;
    const repositioned = chars.map((c, i) => ({
      ...c,
      position: calcPosition(i, total, state.layout),
    }));
    set({
      characters: repositioned,
      selectedCharacterId: config.id,
    });
  },

  /**
   * 从场景中移除角色
   * 至少保留一个角色，移除后重新计算位置，选中下一个角色
   */
  removeCharacter: (id) => {
    const state = get();
    if (state.characters.length <= 1) return; // 至少保留一个角色
    const chars = state.characters.filter((c) => c.characterConfig.id !== id);
    const total = chars.length;
    const repositioned = chars.map((c, i) => ({
      ...c,
      position: calcPosition(i, total, state.layout),
    }));
    set({
      characters: repositioned,
      selectedCharacterId:
        state.selectedCharacterId === id
          ? repositioned[0]?.characterConfig.id ?? null
          : state.selectedCharacterId,
    });
  },

  /**
   * 复制角色（深拷贝配置）
   * 在角色名称后追加"(副本)"标记
   */
  duplicateCharacter: (id) => {
    const state = get();
    const source = state.characters.find((c) => c.characterConfig.id === id);
    if (!source) return;
    const newConfig: CharacterConfig = {
      ...JSON.parse(JSON.stringify(source.characterConfig)),
      id: generateId(),
      name: `${source.characterConfig.name} (副本)`,
    };
    const sc: SceneCharacter = {
      characterConfig: newConfig,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    };
    const chars = [...state.characters, sc];
    const total = chars.length;
    const repositioned = chars.map((c, i) => ({
      ...c,
      position: calcPosition(i, total, state.layout),
    }));
    set({ characters: repositioned, selectedCharacterId: newConfig.id });
  },

  /* ====== 选中/更新/清空 ====== */

  /** 选中指定 ID 的角色 */
  selectCharacter: (id) => set({ selectedCharacterId: id }),

  /**
   * 更新指定角色的配置
   * 保留角色的位置和旋转信息
   */
  updateCharacterConfig: (id, config) => {
    set({
      characters: get().characters.map((c) =>
        c.characterConfig.id === id ? { ...c, characterConfig: config } : c,
      ),
    });
  },

  /** 更新指定角色的位置 */
  updateCharacterPosition: (id, position) => {
    set({
      characters: get().characters.map((c) =>
        c.characterConfig.id === id ? { ...c, position } : c,
      ),
    });
  },

  /** 更新指定角色的旋转 */
  updateCharacterRotation: (id, rotation) => {
    set({
      characters: get().characters.map((c) =>
        c.characterConfig.id === id ? { ...c, rotation } : c,
      ),
    });
  },

  /**
   * 清空场景并重置为默认状态
   * 创建一个新角色作为初始角色
   */
  clearScene: () => {
    const config = createDefaultCharacterConfig({ name: '我的角色' });
    set({
      characters: [
        {
          characterConfig: config,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      ],
      selectedCharacterId: null,
      sceneName: '新场景',
    });
  },

  /**
   * 切换布局模式并重新计算所有角色位置
   */
  setLayout: (layout) => {
    const state = get();
    const total = state.characters.length;
    const repositioned = state.characters.map((c, i) => ({
      ...c,
      position: calcPosition(i, total, layout),
    }));
    set({ layout, characters: repositioned });
  },

  /** 设置场景名称 */
  setSceneName: (name) => set({ sceneName: name }),

  /**
   * 应用预设：创建预设配置的角色并添加到场景
   */
  applyPreset: (presetId) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const config = preset.getConfig();
    config.id = generateId();
    get().addCharacter(config);
  },

  /**
   * 保存当前场景配置为 SceneConfig 对象
   * @returns 序列化的场景配置，可用于 localStorage 持久化
   */
  saveScene: () => {
    const state = get();
    return {
      id: `scene_${Date.now()}`,
      name: state.sceneName,
      characters: state.characters,
      layout: state.layout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * 加载已保存的场景配置
   * 恢复角色列表、布局和场景名称，选中第一个角色
   * @param scene - 之前保存的场景配置
   */
  loadScene: (scene) => {
    set({
      characters: scene.characters,
      layout: scene.layout,
      sceneName: scene.name,
      selectedCharacterId: scene.characters[0]?.characterConfig.id ?? null,
    });
  },
};
});
