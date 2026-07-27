/**
 * CharacterPortrait3D - 3D 角色捏脸主页面组件
 *
 * 提供基于 Three.js 的 3D 角色创建和场景管理功能：
 * - 预设角色快速切换（战士、法师、弓箭手、动物等）
 * - 多角色场景管理（一字/弧线/自由布局）
 * - 角色配置面板（体型、肤色、发型、换装等）
 * - AI 图转 3D 模型
 * - 场景保存/加载（localStorage 持久化）
 * - STL 导出 / 3D 打印订单
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Typography, message, Row, Col, Tooltip, Modal, Input, Select, InputNumber } from 'antd';
import { RotateRightOutlined, UndoOutlined, SaveOutlined, FolderOpenOutlined, DeleteOutlined, ThunderboltOutlined, PrinterOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import * as THREE from 'three';

import ConfigPanel from './character3d/ConfigPanel';
import Viewport3D from './character3d/Viewport3D';
import SceneManager from './character3d/SceneManager';
import ImageTo3D from './character3d/upload/ImageTo3D';
import { PRESETS } from './character3d/presets';
import { useSceneStore } from './character3d/SceneStore';
import {
  CharacterConfig, SceneConfig,
  createDefaultCharacterConfig, generateId,
} from './character3d/types';

const { Title, Text } = Typography;

/** localStorage 场景存储键名 */
const SCENE_STORAGE_KEY = 'saved_3d_scenes';

/**
 * CharacterPortrait3D 主组件
 * 整合 3D 场景管理、角色配置、预设切换、模型导入和场景持久化等功能
 */
const CharacterPortrait3D: React.FC = () => {
  const store = useSceneStore();                                // Zustand 场景状态管理
  const sceneRef = useRef<THREE.Scene | null>(null);            // Three.js 场景引用（用于 STL 导出）

  /* ====== 组件状态 ====== */
  const [autoRotate, setAutoRotate] = useState(true);            // 是否自动旋转
  const [isPending, setIsPending] = useState(false);             // AI 操作加载中
  const [modelLoading, setModelLoading] = useState(false);       // 模型加载中
  const [savedScenes, setSavedScenes] = useState<SceneConfig[]>([]); // 已保存的场景列表
  const [stlModalOpen, setStlModalOpen] = useState(false);       // STL 导出弹窗
  const [printSize, setPrintSize] = useState(100);               // 3D 打印尺寸(mm)
  const [printMaterial, setPrintMaterial] = useState('pla');     // 3D 打印材料
  const [multiMode, setMultiMode] = useState(false);             // 多角色模式开关

  /** 从 store 推导当前选中的角色配置 */
  const selectedChar = store.selectedCharacterId
    ? store.characters.find((c) => c.characterConfig.id === store.selectedCharacterId)
    : null;
  const currentConfig = selectedChar?.characterConfig ?? null;

  /**
   * 组件挂载时从 localStorage 加载已保存的场景列表
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCENE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedScenes(parsed);
      }
    } catch { /* 忽略 JSON 解析错误 */ }
  }, []);

  /**
   * 角色配置变更时同步到 store
   * @param config - 更新后的角色配置
   */
  const handleConfigChange = useCallback(
    (config: CharacterConfig) => {
      if (store.selectedCharacterId) {
        store.updateCharacterConfig(store.selectedCharacterId, config);
      }
    },
    [store.selectedCharacterId],
  );

  /**
   * 保存当前场景到 localStorage
   */
  const handleSaveScene = () => {
    const scene = store.saveScene();
    const updated = [scene, ...savedScenes.filter((s) => s.id !== scene.id)];
    setSavedScenes(updated);
    localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(updated));
    message.success(`场景「${scene.name}」已保存`);
  };

  /**
   * 加载已保存的场景
   * @param scene - 要加载的场景配置
   */
  const handleLoadScene = (scene: SceneConfig) => {
    store.loadScene(scene);
    message.success(`已加载场景：${scene.name}`);
  };

  /**
   * 删除已保存的场景
   * @param id - 要删除的场景 ID
   */
  const handleDeleteScene = (id: string) => {
    const updated = savedScenes.filter((s) => s.id !== id);
    setSavedScenes(updated);
    localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(updated));
    message.success('场景已删除');
  };

  /**
   * 选择预设角色
   * 单角色模式：替换当前角色
   * 多角色模式：向场景添加新角色
   * @param presetId - 预设 ID
   */
  const handlePresetSelect = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setModelLoading(true);

    if (multiMode) {
      store.applyPreset(presetId);
      message.success(`已添加预设：${preset.label}`);
    } else {
      // Replace the first (only) character with the preset
      const config = preset.getConfig();
      config.id = store.characters[0]?.characterConfig?.id || generateId();
      const chars = store.characters;
      if (chars.length > 0) {
        store.updateCharacterConfig(chars[0].characterConfig.id, config);
      } else {
        store.addCharacter(config);
      }
      message.success(`已切换预设：${preset.label}`);
    }

    // 等待 3 帧让 R3F 完成渲染，再关闭加载指示
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setModelLoading(false);
        });
      });
    });
  };

  /**
   * 为当前角色生成 AI 描述（当前为模拟实现）
   */
  const handleGenerateDescription = async () => {
    if (!currentConfig) {
      message.warning('请先选择一个角色');
      return;
    }
    if (!currentConfig.name.trim()) {
      message.warning('请先输入角色名称');
      return;
    }
    setIsPending(true);
    setTimeout(() => {
      message.success(`「${currentConfig.name}」的角色描述已生成（AI 功能待接入）`);
      setIsPending(false);
    }, 1000);
  };

  /**
   * 导出当前场景为 STL 文件（用于 3D 打印）
   * 动态导入 STLExport 模块以避免循环依赖
   */
  const handleExportSTL = () => {
    if (!sceneRef.current) {
      message.warning('3D 场景尚未就绪');
      return;
    }
    try {
      import('./character3d/export/STLExport').then(({ exportSceneToSTL }) => {
        const blob = exportSceneToSTL(sceneRef.current!);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentConfig?.name || 'character'}.stl`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('STL 文件已导出');
      });
    } catch {
      message.error('STL 导出失败');
    }
  };

  /**
   * 提交 3D 打印订单
   */
  const handlePrintOrder = () => {
    message.success(`打印订单已提交：${printMaterial.toUpperCase()}, ${printSize}mm`);
    setStlModalOpen(false);
  };

  /**
   * 重置视角：短暂关闭自动旋转再重新打开以触发控件重置
   */
  const handleResetView = () => {
    setAutoRotate(false);
    setTimeout(() => setAutoRotate(true), 100);
  };

  /**
   * 图转 3D 模型生成完成回调
   * 将生成的 GLB 模型作为新角色添加到场景中
   * @param modelUrl - 生成模型的 URL
   * @param taskId - 生成任务 ID
   */
  const handleModelReady = useCallback((modelUrl: string, taskId: string) => {
    const newConfig = createDefaultCharacterConfig({
      type: 'human',
      name: `3D生成 ${new Date().toLocaleTimeString()}`,
      modelUrl,
      modelTaskId: taskId,
    });
    newConfig.id = `char_3dgen_${Date.now()}`;
    store.addCharacter(newConfig);
    message.success(`3D 生成模型已添加至场景`);
  }, [store]);

  return (
    <div className="space-y-4 ai-portrait-page">
      <div className="text-center mb-2">
        <Title level={4} className="!mb-1 !text-white">🎨 3D 角色捏脸</Title>
        <Text className="text-gray-300" style={{ fontSize: '1.5rem' }}>打造你的专属 3D 游戏形象 — 支持多角色场景、人物/动物、换装、动作切换</Text>
      </div>

      {/* Preset bar + mode toggle */}
      <Card size="small" className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Text className="text-xs text-gray-400 mr-1">预设：</Text>
            {PRESETS.map((preset) => (
              <motion.div key={preset.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="small"
                  style={{
                    borderColor: preset.color,
                    color: preset.color,
                  }}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  {preset.icon} {preset.label}
                </Button>
              </motion.div>
            ))}
          </div>
          <Tooltip title={multiMode ? '切换到单角色模式' : '切换到多角色模式'}>
            <Button
              size="small"
              type={multiMode ? 'primary' : 'default'}
              onClick={() => setMultiMode(!multiMode)}
            >
              {multiMode ? '📋 多角色' : '👤 单角色'}
            </Button>
          </Tooltip>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left: Scene Manager + Config Panel */}
        <Col xs={24} md={10} lg={8}>
          <div className="space-y-3">
            {/* Scene Manager — only in multi mode */}
            {multiMode && (
              <Card size="small" title="场景管理" className="h-full">
                <SceneManager
                  characters={store.characters}
                  selectedCharacterId={store.selectedCharacterId}
                  layout={store.layout}
                  sceneName={store.sceneName}
                  onSelectCharacter={store.selectCharacter}
                  onAddCharacter={store.addCharacter}
                  onRemoveCharacter={store.removeCharacter}
                  onDuplicateCharacter={store.duplicateCharacter}
                  onClearScene={store.clearScene}
                  onSetLayout={store.setLayout}
                  onSetSceneName={store.setSceneName}
                />
              </Card>
            )}

            {/* Image to 3D */}
            <Card size="small" title="AI 图转 3D" className="h-full">
              <ImageTo3D
                onModelReady={handleModelReady}
                disabled={isPending}
              />
            </Card>

            {/* Config Panel — only if a character is selected */}
            {currentConfig && (
              <Card size="small" title={`角色配置 — ${currentConfig.name}`}>
                <ConfigPanel
                  config={currentConfig}
                  onChange={handleConfigChange}
                  onGenerateDescription={handleGenerateDescription}
                  onSave={handleSaveScene}
                  onExportSTL={() => setStlModalOpen(true)}
                  isGenerating={isPending}
                />
              </Card>
            )}
          </div>
        </Col>

        {/* Right: 3D Viewport */}
        <Col xs={24} md={14} lg={16}>
          <Card
            size="small"
            title={
              <div className="flex items-center justify-between w-full">
                <span>3D 预览 {currentConfig ? `— ${currentConfig.name}` : ''}</span>
                <div className="flex gap-1">
                  <Tooltip title="保存场景">
                    <Button
                      size="small"
                      icon={<SaveOutlined />}
                      onClick={handleSaveScene}
                    />
                  </Tooltip>
                  <Tooltip title={autoRotate ? '停止旋转' : '自动旋转'}>
                    <Button
                      size="small"
                      type={autoRotate ? 'primary' : 'default'}
                      icon={<RotateRightOutlined />}
                      onClick={() => setAutoRotate(!autoRotate)}
                    />
                  </Tooltip>
                  <Tooltip title="重置视角">
                    <Button
                      size="small"
                      icon={<UndoOutlined />}
                      onClick={handleResetView}
                    />
                  </Tooltip>
                </div>
              </div>
            }
            className="h-full"
          >
            <Viewport3D
              characters={store.characters}
              selectedCharacterId={store.selectedCharacterId}
              onSelectCharacter={store.selectCharacter}
              autoRotate={autoRotate}
              sceneRef={sceneRef}
              loading={modelLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Saved Scenes */}
      {savedScenes.length > 0 && (
        <Card
          size="small"
          title={`已保存场景 (${savedScenes.length})`}
          extra={
            <Button size="small" icon={<FolderOpenOutlined />} onClick={() => {
              if (savedScenes.length > 0) {
                store.loadScene(savedScenes[0]);
                message.success(`已加载场景：${savedScenes[0].name}`);
              }
            }}>
              加载最新
            </Button>
          }
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            {savedScenes.map((sc) => (
              <motion.div
                key={sc.id}
                className="flex-shrink-0 w-28 group relative"
                whileHover={{ y: -3 }}
              >
                <Card
                  hoverable
                  size="small"
                  className="text-center cursor-pointer"
                  onClick={() => handleLoadScene(sc)}
                  styles={{ body: { padding: '8px' } }}
                >
                  <div className="text-lg mb-0.5">🎬</div>
                  <div className="text-xs font-medium truncate text-white">{sc.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {sc.characters.length} 角色 · {sc.layout === 'row' ? '一字' : sc.layout === 'arc' ? '弧线' : '自由'}
                  </div>
                </Card>
                <Tooltip title="删除">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ minWidth: 18, height: 18, width: 18 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(sc.id);
                    }}
                  />
                </Tooltip>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* STL Export + Print Modal */}
      <Modal
        title="3D 打印导出"
        open={stlModalOpen}
        onCancel={() => setStlModalOpen(false)}
        footer={[
          <Button key="export" icon={<PrinterOutlined />} onClick={handleExportSTL}>
            导出 STL
          </Button>,
          <Button key="order" type="primary" onClick={handlePrintOrder}>
            提交打印订单
          </Button>,
        ]}
      >
        <div className="space-y-3">
          <div>
          <Text className="block mb-1 text-sm text-gray-300">打印尺寸 (mm)</Text>
            <InputNumber
              min={20}
              max={500}
              value={printSize}
              onChange={(v) => setPrintSize(v || 100)}
              style={{ width: 120 }}
              addonAfter="mm"
            />
          </div>
          <div>
            <Text className="block mb-1 text-sm text-gray-300">打印材质</Text>
            <Select
              value={printMaterial}
              onChange={setPrintMaterial}
              style={{ width: 140 }}
              options={[
                { value: 'pla', label: 'PLA 塑料' },
                { value: 'resin', label: '光敏树脂' },
                { value: 'nylon', label: '尼龙' },
              ]}
            />
          </div>
          <Text className="text-xs text-gray-400">
            点击"导出 STL"下载模型文件，或"提交打印订单"将模型发送到后台进行处理。
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default CharacterPortrait3D;
