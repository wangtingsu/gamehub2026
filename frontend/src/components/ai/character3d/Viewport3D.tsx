/**
 * Viewport3D - 3D 视口渲染组件
 *
 * 基于 React Three Fiber 的 3D 渲染场景：
 * - 多角色渲染（人物/动物/GLB 模型）
 * - OrbitControls 轨道控制（旋转/平移/缩放）
 * - 角色选中高亮（地面光环 + 名称标签）
 * - 背景点击取消选中
 * - 自动旋转模式
 * - 场景引用暴露（用于 STL 导出）
 */
import React, { Suspense, useRef, useCallback } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Spin } from 'antd';
import { motion } from 'framer-motion';
import { SceneCharacter } from './types';
import HumanoidModel from './humanoid/HumanoidModel';
import AnimalModel from './animal/AnimalModel';
import GLBModel from './GLBModel';

// ====== 单个角色渲染子组件 ======

/** SceneCharacterInstance 组件的属性接口 */
interface CharProps {
  sc: SceneCharacter;       // 场景角色数据
  isSelected: boolean;      // 是否被选中
  onClick: (id: string) => void; // 点击选中回调
}

/**
 * 单个角色实例渲染组件
 * 根据角色配置渲染对应的 3D 模型（人物/动物/GLB），
 * 并添加选中光圈和名称标签
 */
const SceneCharacterInstance: React.FC<CharProps> = ({ sc, isSelected, onClick }) => {
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(sc.characterConfig.id);
    },
    [sc.characterConfig.id, onClick],
  );

  const config = sc.characterConfig;
  // 类型变化时强制 key 刷新，避免 R3F 渲染残留导致残影
  const typeKey = `${config.type}-${config.animalType || 'human'}-${config.id}-${config.modelUrl || ''}`;

  return (
    <group
      position={[sc.position.x, sc.position.y, sc.position.z]}
      rotation={[sc.rotation.x, sc.rotation.y, sc.rotation.z]}
    >
      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.55, 32]} />
          <meshBasicMaterial color="#4a90d9" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      <group key={typeKey} onClick={handleClick}>
        {config.modelUrl ? (
          <GLBModel
            url={config.modelUrl}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
          />
        ) : config.type === 'animal' ? (
          <AnimalModel
            animalType={config.animalType || 'cat'}
            body={config.body}
            face={config.face}
            pose={config.pose}
          />
        ) : (
          <HumanoidModel
            body={config.body}
            hair={config.hair}
            clothing={config.clothing}
            face={config.face}
            pose={config.pose}
          />
        )}
      </group>

      {/* Name label */}
      <Html position={[0, -0.3, 0]} center style={{ pointerEvents: 'none' }}>
        <span
          style={{
            background: isSelected ? 'rgba(74,144,217,0.9)' : 'rgba(0,0,0,0.5)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          {config.name}
        </span>
      </Html>
    </group>
  );
};

// ====== 场景内容（位于 Canvas 内部） ======

/** SceneContent 组件的属性接口 */
interface SceneContentProps {
  characters: SceneCharacter[];                         // 场景角色列表
  selectedCharacterId: string | null;                   // 当前选中的角色 ID
  onSelectCharacter: (id: string | null) => void;       // 选中角色回调
  autoRotate: boolean;                                  // 是否自动旋转
  sceneRef?: React.MutableRefObject<THREE.Scene | null>; // Three.js 场景引用
}

/**
 * SceneContent 场景内容组件
 * 在 Canvas 内部渲染灯光、地面、所有角色和轨道控制器
 */
const SceneContent: React.FC<SceneContentProps> = ({
  characters, selectedCharacterId, onSelectCharacter, autoRotate, sceneRef,
}) => {
  const { scene } = useThree();

  // 将 Three.js 场景引用暴露给父组件（用于 STL 导出）
  React.useEffect(() => {
    if (sceneRef) sceneRef.current = scene;
  }, [scene, sceneRef]);

  /**
   * 点击地面空白区域取消选中角色
   */
  const handleBackgroundClick = useCallback(() => {
    onSelectCharacter(null);
  }, [onSelectCharacter]);

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />
      <directionalLight position={[0, -2, -5]} intensity={0.2} />

      {/* Ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
        onClick={handleBackgroundClick}
      >
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#f0f0f0" roughness={1} />
      </mesh>

      {/* Characters */}
      {characters.map((sc) => (
        <SceneCharacterInstance
          key={sc.characterConfig.id}
          sc={sc}
          isSelected={selectedCharacterId === sc.characterConfig.id}
          onClick={onSelectCharacter}
        />
      ))}

      {/* Controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate={autoRotate}
        autoRotateSpeed={3}
        minDistance={1.5}
        maxDistance={8}
        target={[0, 0.8, 0]}
      />
    </>
  );
};

// ====== 主 Viewport3D 组件 ======

/** Viewport3D 组件的属性接口 */
interface Viewport3DProps {
  characters: SceneCharacter[];                         // 场景角色列表
  selectedCharacterId: string | null;                   // 当前选中的角色 ID
  onSelectCharacter: (id: string | null) => void;       // 选中角色回调
  autoRotate?: boolean;                                 // 是否自动旋转（默认 true）
  sceneRef?: React.MutableRefObject<THREE.Scene | null>; // Three.js 场景引用
  loading?: boolean;                                    // 是否显示加载覆盖层
}

/**
 * Viewport3D 主组件
 * 创建 Three.js Canvas 渲染 3D 场景，支持角色展示和交互
 */
const Viewport3D: React.FC<Viewport3DProps> = ({
  characters, selectedCharacterId, onSelectCharacter, autoRotate = true, sceneRef, loading = false,
}) => (
  <div className="w-full relative" style={{ height: 500 }}>
    <Canvas
      camera={{ position: [0, 1.2, 4], fov: 40 }}
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      style={{
        background: 'linear-gradient(180deg, #e8f0fe 0%, #f0e6ff 100%)',
        borderRadius: 8,
      }}
    >
      <Suspense fallback={
        <Html center>
          <Spin size="large" tip="加载 3D 模型中..." />
        </Html>
      }>
        <SceneContent
          characters={characters}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={onSelectCharacter}
          autoRotate={autoRotate}
          sceneRef={sceneRef}
        />
      </Suspense>
    </Canvas>

    {/* 加载覆盖层：模型加载过程中显示旋转加载图标 */}
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-lg z-10">
        <Spin size="large" />
      </div>
    )}
  </div>
);

export default Viewport3D;
