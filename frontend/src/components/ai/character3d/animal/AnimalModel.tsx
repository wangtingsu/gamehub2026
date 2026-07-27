/**
 * AnimalModel - 3D 动物模型渲染组件
 *
 * 根据动物类型选择渲染策略：
 * - 猫/狗（GLTF_TYPES）：使用预加载的 Fox.gltf 模型 + 动画
 * - 兔子/熊（Primitive）：使用 Three.js 原始几何体组合构建
 *
 * 功能：
 * - 模型材质着色（根据动物类型设定颜色）
 * - 姿势切换动画（站立/坐姿/趴下/摇尾巴）
 * - 平滑姿势过渡（使用 lerp 插值）
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { BodyProportions, FaceConfig, AnimalType } from '../types';

// ====== 常量 ======

const FOX_PATH = '/models/Fox/Fox.gltf';

/** 使用 GLTF 模型渲染的动物类型（猫和狗共用狐狸模型） */
const GLTF_TYPES = new Set(['cat', 'dog']);

/**
 * 动物外观配置
 * - Fox.gltf 模型约 50 单位高，无内建缩放
 * - GLTF 类型（cat/dog）缩放约 1/50 ≈ 0.02 以归一化
 * - 原始几何类型（rabbit/bear）直接使用 body.height
 * @note scale 字段仅用于 GLTFAnimalModel
 */
const ANIMAL_APPEARANCE: Record<AnimalType, { scale: number; color: string }> = {
  cat: { scale: 0.022, color: '#ff8c00' },
  dog: { scale: 0.026, color: '#c8a882' },
  rabbit: { scale: 0.65, color: '#f5f5f5' },
  bear: { scale: 1.3, color: '#8B4513' },
};

const POSE_TO_ANIM: Record<string, string> = {
  stand: 'Survey',
  sit: 'Survey',
  lie: 'Survey',
  wagTail: 'Walk',
};

// ====== 基于 GLTF 的动物渲染（猫/狗） ======

/** AnimalModel 组件属性接口 */
interface AnimalModelProps {
  animalType: AnimalType;     // 动物类型
  body: BodyProportions;      // 身体比例配置
  face: FaceConfig;           // 面部配置
  pose?: string;              // 当前姿势（默认 'stand'）
}

/**
 * GLTFAnimalModel 子组件
 * 加载 Fox.gltf 模型，克隆场景实例，根据动物类型着色，
 * 并播放对应的动画（姿势切换）
 */
const GLTFAnimalModel: React.FC<AnimalModelProps> = ({
  animalType, body, face, pose = 'stand',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(FOX_PATH);
  const { actions } = useAnimations(animations, groupRef);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    (clone as any).animations = animations;
    return clone;
  }, [scene, animations]);

  // Material tint
  useEffect(() => {
    const appearance = ANIMAL_APPEARANCE[animalType];
    clonedScene.traverse((node) => {
      if (node instanceof THREE.Mesh || (node as any).isMesh) {
        const mat = (node as THREE.Mesh).material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color.set(appearance.color);
          mat.roughness = 0.58;
          mat.metalness = 0;
        }
      }
    });
  }, [clonedScene, animalType]);

  // Animation (cross-fade)
  useEffect(() => {
    const animName = POSE_TO_ANIM[pose] || 'Survey';
    const action = actions[animName];
    if (action) {
      Object.values(actions).forEach((a) => {
        if (a !== action) a?.fadeOut(0.3);
      });
      action.reset().fadeIn(0.3).play();
    }
    return () => { Object.values(actions).forEach((a) => a?.stop()); };
  }, [pose, actions]);

  const scale = body.height * ANIMAL_APPEARANCE[animalType].scale;

  return (
    <group ref={groupRef} scale={scale} position={[0, 0, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
};

// ====== 原始几何体动物渲染（兔子/熊） ======

const darkenColor = (hex: string, amount: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max((num >> 16) - amount, 0);
  const g = Math.max(((num >> 8) & 0xff) - amount, 0);
  const b = Math.max((num & 0xff) - amount, 0);
  return `rgb(${r},${g},${b})`;
};

const ANIMAL_COLORS: Record<AnimalType, { body: string; belly: string; nose: string }> = {
  cat: { body: '#ff8c00', belly: '#ffebcd', nose: '#ff69b4' },
  dog: { body: '#c8a882', belly: '#f5deb3', nose: '#333' },
  rabbit: { body: '#f5f5f5', belly: '#fff', nose: '#ffb6c1' },
  bear: { body: '#8B4513', belly: '#d2b48c', nose: '#222' },
};

/**
 * 平滑胶囊体辅助组件
 * 使用两个半球 + 圆柱体组合成一个圆滑的胶囊形状
 * 用于动物身体的主体构造
 */
const SmoothCapsule: React.FC<{
  position: [number, number, number];
  radius: number;
  length: number;
  color: string;
  rotation?: [number, number, number];
  castShadow?: boolean;
  segments?: number;
}> = ({ position, radius, length, color, rotation, castShadow, segments = 24 }) => (
  <group position={position} rotation={rotation as any}>
    <mesh castShadow={castShadow}>
      <cylinderGeometry args={[radius, radius, length, segments, 1, true]} />
      <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, length / 2, 0]} castShadow={castShadow}>
      <sphereGeometry args={[radius, segments, segments / 2, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <mesh position={[0, -length / 2, 0]} castShadow={castShadow}>
      <sphereGeometry args={[radius, segments, segments / 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  </group>
);

/**
 * PrimitiveAnimalModel 子组件
 * 使用 Three.js 原始几何体（球体、圆柱体、胶囊体等）构建动物模型
 * 支持身体缩放、头部大小调整、姿势平滑过渡和品种特定特征绘制
 */
const PrimitiveAnimalModel: React.FC<AnimalModelProps> = ({
  animalType, body, face, pose = 'stand',
}) => {
  const colors = ANIMAL_COLORS[animalType];
  const s = body.height;
  const hs = body.headSize;

  const isRabbit = animalType === 'rabbit';
  const isBear = animalType === 'bear';

  // Smooth leg pose transition via lerp
  const targetLegPose = useRef(0);
  const currentLegPose = useRef(0);

  useEffect(() => {
    switch (pose) {
      case 'sit': targetLegPose.current = 0.3; break;
      case 'lie': targetLegPose.current = 0.6; break;
      default: targetLegPose.current = 0;
    }
  }, [pose]);

  useFrame((_, delta) => {
    currentLegPose.current = THREE.MathUtils.lerp(
      currentLegPose.current,
      targetLegPose.current,
      delta * 6,
    );
  });

  return (
    <group scale={[s, s, s]} position={[0, 0, 0]}>
      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[0.8, 0.6]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>

      {/* Tail */}
      {isRabbit ? (
        <mesh position={[-0.25, 0.18, -0.2]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#fff" roughness={0.8} />
        </mesh>
      ) : isBear ? (
        <mesh position={[-0.25, 0.12, -0.18]}>
          <sphereGeometry args={[0.025, 0.03, 0.04, 12, 12]} />
          <meshStandardMaterial color={darkenColor(colors.body, 15)} roughness={0.8} />
        </mesh>
      ) : (
        <mesh position={[-0.25, 0.12, -0.18]} rotation={[0.3, 0, -0.2]}>
          <cylinderGeometry args={[0.015, 0.03, 0.15, 10]} />
          <meshStandardMaterial color={colors.body} roughness={0.7} />
        </mesh>
      )}

      {/* Body */}
      <SmoothCapsule
        position={[0, 0.2, 0]}
        radius={0.13}
        length={0.28}
        color={colors.body}
        castShadow
      />

      {/* Belly patch */}
      <mesh position={[0, 0.16, 0.1]}>
        <sphereGeometry args={[0.08, 0.06, 0.04, 16, 16]} />
        <meshStandardMaterial color={colors.belly} roughness={0.8} />
      </mesh>

      {/* Legs */}
      {[[-0.09, 0.06, 0.12], [0.09, 0.06, 0.12], [-0.09, 0.06, -0.12], [0.09, 0.06, -0.12]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} rotation={z > 0 ? [currentLegPose.current, 0, 0] : [-currentLegPose.current * 0.5, 0, 0]}>
          <mesh position={[0, -0.04, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.03, 0.1, 12]} />
            <meshStandardMaterial color={colors.body} roughness={0.7} />
          </mesh>
          {/* Paw */}
          <mesh position={[0, -0.07, 0.01]} castShadow>
            <sphereGeometry args={[0.025, 0.018, 0.03, 10, 10]} />
            <meshStandardMaterial color={darkenColor(colors.body, 25)} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Neck */}
      <mesh position={[0, 0.32, 0.28]} castShadow>
        <cylinderGeometry args={[0.035 * hs, 0.05 * hs, 0.05, 12]} />
        <meshStandardMaterial color={colors.body} roughness={0.7} />
      </mesh>

      {/* Head */}
      <group position={[0, 0.38, 0.36 * hs]}>
        {/* Main head sphere */}
        <mesh castShadow>
          <sphereGeometry args={[0.1 * hs, 0.09 * hs, 0.09 * hs, 24, 24]} />
          <meshStandardMaterial color={colors.body} roughness={0.7} />
        </mesh>

        {/* Snout / face area */}
        {isRabbit ? (
          <>
            <mesh position={[0, -0.015 * hs, 0.09 * hs]}>
              <sphereGeometry args={[0.045 * hs, 0.035 * hs, 0.05 * hs, 20, 20]} />
              <meshStandardMaterial color="#fff" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.01 * hs, 0.12 * hs]}>
              <sphereGeometry args={[0.014 * hs, 0.01 * hs, 0.01 * hs, 12, 12]} />
              <meshStandardMaterial color={colors.nose} roughness={0.5} />
            </mesh>
          </>
        ) : isBear ? (
          <>
            <mesh position={[0, -0.025 * hs, 0.1 * hs]}>
              <sphereGeometry args={[0.06 * hs, 0.045 * hs, 0.06 * hs, 20, 20]} />
              <meshStandardMaterial color={darkenColor(colors.body, 20)} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.14 * hs]}>
              <sphereGeometry args={[0.018 * hs, 0.014 * hs, 0.014 * hs, 10, 10]} />
              <meshStandardMaterial color={colors.nose} roughness={0.5} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, -0.015 * hs, 0.09 * hs]}>
              <sphereGeometry args={[0.035 * hs, 0.03 * hs, 0.05 * hs, 20, 20]} />
              <meshStandardMaterial color={colors.belly} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.01 * hs, 0.12 * hs]}>
              <sphereGeometry args={[0.01 * hs, 0.008 * hs, 0.008 * hs, 8, 8]} />
              <meshStandardMaterial color={colors.nose} roughness={0.5} />
            </mesh>
          </>
        )}

        {/* Eyes */}
        {[[-0.045 * hs, 0.04 * hs, 0.08 * hs], [0.045 * hs, 0.04 * hs, 0.08 * hs]].map((pos, i) => (
          <group key={i}>
            <mesh position={pos as [number, number, number]}>
              <sphereGeometry args={[0.022 * hs, 16, 16]} />
              <meshStandardMaterial color={face.eyeColor} roughness={0.1} />
            </mesh>
            <mesh position={[pos[0] - 0.004 * hs, pos[1] + 0.005 * hs, pos[2] + 0.015 * hs]}>
              <sphereGeometry args={[0.007 * hs, 8, 8]} />
              <meshStandardMaterial color="white" />
            </mesh>
          </group>
        ))}

        {/* Ears */}
        {isRabbit ? (
          <>
            <mesh position={[-0.055 * hs, 0.12 * hs, 0]} rotation={[-0.15, 0, -0.15]}>
              <capsuleGeometry args={[0.018 * hs, 0.14 * hs, 10, 12]} />
              <meshStandardMaterial color={colors.body} roughness={0.7} />
            </mesh>
            <mesh position={[0.055 * hs, 0.12 * hs, 0]} rotation={[-0.15, 0, 0.15]}>
              <capsuleGeometry args={[0.018 * hs, 0.14 * hs, 10, 12]} />
              <meshStandardMaterial color={colors.body} roughness={0.7} />
            </mesh>
            {/* Inner ear pink */}
            <mesh position={[-0.05 * hs, 0.1 * hs, 0.012 * hs]} rotation={[-0.15, 0, -0.15]}>
              <capsuleGeometry args={[0.008 * hs, 0.1 * hs, 6, 8]} />
              <meshStandardMaterial color="#ffb6c1" roughness={0.6} />
            </mesh>
            <mesh position={[0.05 * hs, 0.1 * hs, 0.012 * hs]} rotation={[-0.15, 0, 0.15]}>
              <capsuleGeometry args={[0.008 * hs, 0.1 * hs, 6, 8]} />
              <meshStandardMaterial color="#ffb6c1" roughness={0.6} />
            </mesh>
          </>
        ) : isBear ? (
          <>
            <mesh position={[-0.065 * hs, 0.09 * hs, 0]} rotation={[-0.1, 0, -0.2]}>
              <sphereGeometry args={[0.028 * hs, 0.02 * hs, 0.018 * hs, 12, 12]} />
              <meshStandardMaterial color={darkenColor(colors.body, 20)} roughness={0.7} />
            </mesh>
            <mesh position={[0.065 * hs, 0.09 * hs, 0]} rotation={[-0.1, 0, 0.2]}>
              <sphereGeometry args={[0.028 * hs, 0.02 * hs, 0.018 * hs, 12, 12]} />
              <meshStandardMaterial color={darkenColor(colors.body, 20)} roughness={0.7} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[-0.065 * hs, 0.1 * hs, 0]} rotation={[-0.1, 0, -0.25]}>
              <coneGeometry args={[0.025 * hs, 0.07 * hs, 12]} />
              <meshStandardMaterial color={darkenColor(colors.body, 15)} roughness={0.7} />
            </mesh>
            <mesh position={[0.065 * hs, 0.1 * hs, 0]} rotation={[-0.1, 0, 0.25]}>
              <coneGeometry args={[0.025 * hs, 0.07 * hs, 12]} />
              <meshStandardMaterial color={darkenColor(colors.body, 15)} roughness={0.7} />
            </mesh>
          </>
        )}

        {/* Mouth */}
        <mesh position={[0, -0.035 * hs, 0.1 * hs]}>
          <boxGeometry args={[0.02 * hs, 0.004 * hs, 0.004 * hs]} />
          <meshStandardMaterial color={darkenColor(colors.body, 40)} roughness={0.5} />
        </mesh>

        {/* Whiskers (rabbit) */}
        {isRabbit && (
          <>
            {[[-0.04, 0.01], [0.04, 0.01], [-0.04, 0], [0.04, 0]].map(([x, y], i) => (
              <mesh key={i} position={[x * hs, y * hs, 0.1 * hs]} rotation={[0, x < 0 ? 0.4 : -0.4, 0]}>
                <boxGeometry args={[0.02 * hs, 0.002 * hs, 0.002 * hs]} />
                <meshStandardMaterial color="#ccc" roughness={0.5} />
              </mesh>
            ))}
          </>
        )}
      </group>
    </group>
  );
};

// ====== 主组件 ======

/**
 * AnimalModel 主组件
 * 根据动物类型自动选择渲染策略：
 * - cat/dog -> 使用 GLTF 模型（Fox.gltf）
 * - rabbit/bear -> 使用原始几何体构造
 */
const AnimalModel: React.FC<AnimalModelProps> = (props) => {
  if (GLTF_TYPES.has(props.animalType)) {
    return <GLTFAnimalModel {...props} />;
  }
  return <PrimitiveAnimalModel {...props} />;
};

useGLTF.preload(FOX_PATH);

export default AnimalModel;
