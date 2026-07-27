/**
 * HumanoidModel - 3D 人体模型渲染组件
 *
 * 基于预加载的 human.glb 模型，附加自定义面部特征和配件：
 * - 模型材质自定义（根据服装配置着色）
 * - 发型渲染（短发/长发/马尾/卷发/莫西干/光头）
 * - 面部特征（眼睛、鼻子、嘴巴、耳朵）
 * - 配件（帽子、眼镜、剑、披风）
 * - 服装附加物（腰带、肩甲）
 * - 动画跨淡切换（站立/行走/跑步）
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { BodyProportions, ClothingConfig, FaceConfig, HairConfig } from '../types';

// ====== 模型路径与位置常量 ======

const MODEL_PATH = '/models/human.glb';

/** 头部中心 Y 轴坐标（GLTF 模型约 1.8 单位高） */
const HEAD_Y = 1.65;
/** 头部半径（基于士兵模型的实际比例） */
const HEAD_R = 0.22;

/** 姿势到动画名称的映射 */
const POSE_TO_ANIM: Record<string, string> = {
  standing: 'Idle',
  walking: 'Walk',
  wave: 'Idle',
  sit: 'Idle',
  jump: 'Run',
  victory: 'Idle',
};

// ====== 颜色辅助工具（THREE.Color 版本） ======

/**
 * 颜色加深函数
 * @param hex - 十六进制颜色值
 * @param amount - 加深幅度
 * @returns THREE.Color 对象
 */
const darkenColor3 = (hex: string, amount: number): THREE.Color => {
  const c = new THREE.Color(hex);
  c.r = Math.max(c.r - amount / 255, 0);
  c.g = Math.max(c.g - amount / 255, 0);
  c.b = Math.max(c.b - amount / 255, 0);
  return c;
};

// ====== 面部位置辅助函数：计算头部球体表面上的点 ======

/**
 * 计算头部球体表面指定经纬度对应的 3D 坐标
 * 用于将面部特征（眼睛、鼻子、嘴巴等）精确放置在模型头部表面
 * @param latDeg - 纬度（角度制，0 为顶部）
 * @param lonDeg - 经度（角度制，0 为正前方）
 * @param s - 大小倍率
 * @returns [x, y, z] 坐标
 */
const facePt = (latDeg: number, lonDeg: number, s = 1): [number, number, number] => {
  const r = HEAD_R * s * 1.01;
  const a = THREE.MathUtils.degToRad(latDeg);
  return [
    r * Math.sin(a) * Math.sin(THREE.MathUtils.degToRad(lonDeg)),
    HEAD_Y - r * Math.cos(a),
    r * Math.sin(a) * Math.cos(THREE.MathUtils.degToRad(lonDeg)),
  ];
};

// ====== 发型子组件 ======

/** 短发：使用半球体覆盖头顶 */
const HairShort: React.FC<{ color: string }> = ({ color }) => (
  <mesh position={[0, HEAD_Y + HEAD_R * 0.45, 0]} rotation={[0, 0, 0]}>
    <sphereGeometry args={[HEAD_R * 1.15, HEAD_R * 0.8, HEAD_R * 0.8, 16, 12, 0, Math.PI * 2]} />
    <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
  </mesh>
);

/** 长发：半球体 + 两侧垂下的条状 */
const HairLong: React.FC<{ color: string }> = ({ color }) => (
  <group position={[0, HEAD_Y + HEAD_R * 0.4, 0]}>
    <mesh>
      <sphereGeometry args={[HEAD_R * 1.2, HEAD_R * 0.85, HEAD_R * 0.85, 16, 12, 0, Math.PI * 2]} />
      <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
    {[-1, 1].map((dir) => (
      <mesh key={dir} position={[dir * HEAD_R * 0.7, -HEAD_R * 1.6, 0]}>
        <boxGeometry args={[0.04, HEAD_R * 1.4, 0.025]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    ))}
  </group>
);

/** 马尾：半球体 + 一个圆形发髻在脑后 */
const HairPonytail: React.FC<{ color: string }> = ({ color }) => (
  <group position={[0, HEAD_Y + HEAD_R * 0.4, 0]}>
    <mesh>
      <sphereGeometry args={[HEAD_R * 1.1, HEAD_R * 0.8, HEAD_R * 0.8, 16, 12, 0, Math.PI * 2]} />
      <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, -HEAD_R * 0.2, -HEAD_R * 1.0]}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  </group>
);

/** 卷发：较大的半球体 + 多个小圆球作为卷曲立体感 */
const HairCurly: React.FC<{ color: string }> = ({ color }) => (
  <group position={[0, HEAD_Y + HEAD_R * 0.4, 0]}>
    <mesh>
      <sphereGeometry args={[HEAD_R * 1.25, HEAD_R * 0.95, HEAD_R * 0.95, 16, 12, 0, Math.PI * 2]} />
      <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
    {[[-0.12, 0.04, 0.15], [0.12, 0.04, 0.15], [0, 0.14, 0.12], [-0.14, -0.02, 0.08], [0.14, -0.02, 0.08]].map(([px, py, pz], i) => (
      <mesh key={i} position={[px, py, pz]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    ))}
  </group>
);

/** 莫西干：竖直长条状 */
const HairMohawk: React.FC<{ color: string }> = ({ color }) => (
  <mesh position={[0, HEAD_Y + HEAD_R * 0.85, 0.02]} rotation={[0.1, 0, 0]}>
    <boxGeometry args={[0.03, HEAD_R * 1.1, 0.08]} />
    <meshStandardMaterial color={color} roughness={0.8} />
  </mesh>
);

/**
 * 发型渲染器
 * 根据发型类型选择对应的 3D 发型组件
 */
const HairRenderer: React.FC<{ style: string; color: string }> = ({ style, color }) => {
  if (style === 'bald') return null;
  switch (style) {
    case 'long': return <HairLong color={color} />;
    case 'ponytail': return <HairPonytail color={color} />;
    case 'curly': return <HairCurly color={color} />;
    case 'mohawk': return <HairMohawk color={color} />;
    default: return <HairShort color={color} />;
  }
};

// ====== 面部特征子组件 ======

/**
 * 眼睛渲染组件
 * 根据眼睛样式渲染不同形态：
 * - 墨镜（sunglasses）：黑色矩形框
 * - 星星眼（sparkle）：带自发光
 * - 大眼/杏眼/睡眼：不同缩放比例的球体
 */
const Eyes: React.FC<{ eyeStyle: string; eyeColor: string }> = ({ eyeStyle, eyeColor }) => {
  const [lx, ly, lz] = facePt(44, -10);
  const [rx, ry, rz] = facePt(44, 10);

  if (eyeStyle === 'sunglasses') {
    return (
      <>
        <mesh position={[lx - 0.01, ly + 0.005, lz + 0.03]} rotation={[0, 0.15, 0]}>
          <boxGeometry args={[0.07, 0.035, 0.01]} />
          <meshStandardMaterial color="#222" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[rx + 0.01, ry + 0.005, rz + 0.03]} rotation={[0, -0.15, 0]}>
          <boxGeometry args={[0.07, 0.035, 0.01]} />
          <meshStandardMaterial color="#222" roughness={0.3} metalness={0.5} />
        </mesh>
      </>
    );
  }

  if (eyeStyle === 'sparkle') {
    return (
      <>
        <mesh position={[lx, ly, lz + 0.02]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[rx, ry, rz + 0.02]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.4} />
        </mesh>
      </>
    );
  }

  const isLarge = eyeStyle === 'large';
  const isAlmond = eyeStyle === 'almond';
  const isSleepy = eyeStyle === 'sleepy';
  const sz = isLarge ? 0.04 : 0.028;
  const scaleY = isAlmond ? 0.6 : isSleepy ? 0.4 : 1;
  const rotZ = isSleepy ? 0.05 : 0;

  return (
    <>
      <mesh position={[lx, ly, lz + 0.02]} scale={[1, scaleY, 1]} rotation={[0, 0, rotZ]}>
        <sphereGeometry args={[sz, 10, 10]} />
        <meshStandardMaterial color={eyeColor} roughness={0.1} />
      </mesh>
      <mesh position={[rx, ry, rz + 0.02]} scale={[1, scaleY, 1]} rotation={[0, 0, -rotZ]}>
        <sphereGeometry args={[sz, 10, 10]} />
        <meshStandardMaterial color={eyeColor} roughness={0.1} />
      </mesh>
    </>
  );
};

/** 鼻子渲染组件：使用球体模拟鼻头 */
const Nose: React.FC<{ skinTone: string; noseSize: number }> = ({ skinTone, noseSize }) => {
  const [x, y, z] = facePt(58, 0);
  return (
    <mesh position={[x, y, z + 0.03]}>
      <sphereGeometry args={[0.025 * noseSize, 0.032 * noseSize, 0.02 * noseSize]} />
      <meshStandardMaterial color={darkenColor3(skinTone, 30)} roughness={0.6} />
    </mesh>
  );
};

/**
 * 嘴巴渲染组件
 * 根据嘴巴样式渲染不同形态（微笑/大笑/张嘴笑/平静/思考/歪嘴）
 */
const Mouth: React.FC<{ skinTone: string; mouthStyle: string }> = ({ skinTone, mouthStyle }) => {
  const [x, y, z] = facePt(68, 0);
  const skinDarker = darkenColor3(skinTone, 60);
  switch (mouthStyle) {
    case 'laugh':
      return (<mesh position={[x, y, z * 1.05]}><sphereGeometry args={[0.03, 0.018, 0.014]} /><meshStandardMaterial color="#4a2820" roughness={0.5} /></mesh>);
    case 'calm':
      return (<mesh position={[x, y, z * 1.05]}><boxGeometry args={[0.05, 0.007, 0.007]} /><meshStandardMaterial color={skinDarker} roughness={0.5} /></mesh>);
    case 'bigSmile':
      return (<mesh position={[x, y, z * 1.05]}><boxGeometry args={[0.065, 0.018, 0.012]} /><meshStandardMaterial color={skinDarker} roughness={0.5} /></mesh>);
    case 'think': {
      const [tx, ty, tz] = facePt(68, -3);
      return (<mesh position={[tx, ty, tz * 1.05]} rotation={[0, 0, 0.1]}><boxGeometry args={[0.035, 0.01, 0.007]} /><meshStandardMaterial color={skinDarker} roughness={0.5} /></mesh>);
    }
    case 'smirk': {
      const [sx, sy, sz] = facePt(68, 3);
      return (<mesh position={[sx, sy, sz * 1.05]} rotation={[0, 0, -0.15]}><boxGeometry args={[0.05, 0.014, 0.012]} /><meshStandardMaterial color={skinDarker} roughness={0.5} /></mesh>);
    }
    default:
      return (<mesh position={[x, y, z * 1.05]}><boxGeometry args={[0.05, 0.012, 0.01]} /><meshStandardMaterial color={skinDarker} roughness={0.5} /></mesh>);
  }
};

/** 耳朵渲染组件：位于头部两侧的扁球体 */
const Ears: React.FC<{ skinTone: string; earSize: number }> = ({ skinTone, earSize }) => {
  const [lx, ly] = facePt(48, -90);
  const [rx, ry] = facePt(48, 90);
  const sz = 0.035 * earSize;
  return (
    <>
      <mesh position={[lx, ly, 0]} rotation={[0, 0.3, 0]}>
        <sphereGeometry args={[sz, 0.025 * earSize, 0.01 * earSize]} />
        <meshStandardMaterial color={darkenColor3(skinTone, 10)} roughness={0.5} />
      </mesh>
      <mesh position={[rx, ry, 0]} rotation={[0, -0.3, 0]}>
        <sphereGeometry args={[sz, 0.025 * earSize, 0.01 * earSize]} />
        <meshStandardMaterial color={darkenColor3(skinTone, 10)} roughness={0.5} />
      </mesh>
    </>
  );
};

// ====== 配件子组件 ======

/**
 * 配件渲染组件
 * 根据配件类型渲染不同 3D 模型：
 * - 帽子（hat）：圆柱体组合
 * - 眼镜（glasses）：环形 + 横梁
 * - 剑（sword）：长条 + 剑柄
 * - 披风（cape）：矩形薄片
 */
const AccessoryItem: React.FC<{ accessory: string; topColor: string }> = ({ accessory, topColor }) => {
  const c = new THREE.Color(topColor);
  const darker = c.clone().multiplyScalar(0.7);

  switch (accessory) {
    case 'hat':
      return (
        <group position={[0, HEAD_Y + HEAD_R * 0.9, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.24, 0.06, 14]} />
            <meshStandardMaterial color="#8B4513" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.08, 14]} />
            <meshStandardMaterial color="#6B3410" roughness={0.7} />
          </mesh>
        </group>
      );
    case 'glasses':
      return (
        <group position={[0, HEAD_Y - HEAD_R * 0.1, HEAD_R * 0.95]}>
          {[-0.08, 0.08].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <torusGeometry args={[0.035, 0.012, 8, 14]} />
              <meshStandardMaterial color="#333" roughness={0.3} metalness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.12, 0.008, 0.005]} />
            <meshStandardMaterial color="#333" roughness={0.3} />
          </mesh>
        </group>
      );
    case 'sword':
      return (
        <group position={[-0.18, 0.75, 0.05]} rotation={[0, 0, -0.25]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <boxGeometry args={[0.012, 0.32, 0.003]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.004, 0.03, 0.012]} />
            <meshStandardMaterial color="#8B4513" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.006, 0.04, 0.008]} />
            <meshStandardMaterial color={darker} roughness={0.6} />
          </mesh>
        </group>
      );
    case 'cape':
      return (
        <mesh position={[0, 0.85, -0.16]} castShadow>
          <boxGeometry args={[0.40, 0.45, 0.015]} />
          <meshStandardMaterial color="#8B0000" roughness={0.9} transparent opacity={0.85} />
        </mesh>
      );
    default:
      return null;
  }
};

// ====== 服装附加物 ======

/** 腰带：环形几何体 */
const Belt: React.FC<{ color: string }> = ({ color }) => (
  <mesh position={[0, 0.72, 0]}>
    <torusGeometry args={[0.13, 0.02, 8, 18]} />
    <meshStandardMaterial color={color} roughness={0.5} />
  </mesh>
);

/** 肩甲：两侧的球体（仅铠甲类型使用） */
const ShoulderPads: React.FC<{ color: string }> = ({ color }) => (
  <>
    <mesh position={[-0.22, 1.32, 0]}>
      <sphereGeometry args={[0.055, 0.04, 0.04, 8, 8]} />
      <meshStandardMaterial color={darkenColor3(color, 20)} roughness={0.4} metalness={0.3} />
    </mesh>
    <mesh position={[0.22, 1.32, 0]}>
      <sphereGeometry args={[0.055, 0.04, 0.04, 8, 8]} />
      <meshStandardMaterial color={darkenColor3(color, 20)} roughness={0.4} metalness={0.3} />
    </mesh>
  </>
);

// ====== 主组件 ======

/** HumanoidModel 组件的属性接口 */
interface HumanoidModelProps {
  body: BodyProportions;   // 身体比例
  hair: HairConfig;        // 发型
  clothing: ClothingConfig; // 服装
  face: FaceConfig;        // 面部
  pose?: string;           // 姿势（默认 'standing'）
}

/**
 * HumanoidModel 主组件
 * 使用 GLTF 人体模型 + 自定义面部/发型/配件渲染完整的 3D 人物
 * 支持材质定制、动画切换、配件添加
 */
const HumanoidModel: React.FC<HumanoidModelProps> = ({
  body, hair, clothing, face, pose = 'standing',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, groupRef);

  // 克隆场景实例以避免材质编辑泄漏到其他实例
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    (clone as any).animations = animations;
    return clone;
  }, [scene, animations]);

  // ---- Material customization on GLTF body ----
  useEffect(() => {
    clonedScene.traverse((node) => {
      if (node instanceof THREE.SkinnedMesh || (node as any).isMesh) {
        const mat = (node as THREE.SkinnedMesh).material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (node.name.includes('vanguard_Mesh')) {
            // Main body — tint with clothing topColor, finish by type
            mat.color.set(clothing.topColor);
            mat.metalness = clothing.top === 'armor' ? 0.35 : clothing.top === 'robe' ? 0.0 : 0.1;
            mat.roughness = clothing.top === 'armor' ? 0.35 : clothing.top === 'robe' ? 0.85 : 0.6;
          }
          if (node.name.includes('visor')) {
            // Visor — use eye color with metallic finish
            const c = new THREE.Color(face.eyeColor);
            mat.color.set(c);
            mat.emissive?.set(c);
            mat.emissiveIntensity = 0.15;
            mat.metalness = 0.7;
            mat.roughness = 0.15;
          }
        }
      }
    });
  }, [clonedScene, clothing.topColor, clothing.top, face.eyeColor]);

  // ---- Animation (cross-fade) ----
  useEffect(() => {
    const animName = POSE_TO_ANIM[pose] || 'Idle';
    const action = actions[animName];
    if (action) {
      // Fade out all other animations, fade in the target
      Object.values(actions).forEach((a) => {
        if (a !== action) a?.fadeOut(0.3);
      });
      action.reset().fadeIn(0.3).play();
    }
    return () => {
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [pose, actions]);

  const modelScale = body.height;

  return (
    <group ref={groupRef} scale={modelScale} position={[0, 0, 0]}>
      {/* GLTF base model */}
      <primitive object={clonedScene} />

      {/* ---- Hair ---- */}
      <HairRenderer style={hair.style} color={hair.color} />

      {/* ---- Face Features ---- */}
      <Eyes eyeStyle={face.eyeStyle} eyeColor={face.eyeColor} />
      <Nose skinTone={face.skinTone} noseSize={face.noseSize} />
      <Mouth skinTone={face.skinTone} mouthStyle={face.mouthStyle} />
      <Ears skinTone={face.skinTone} earSize={face.earSize} />

      {/* ---- Accessories ---- */}
      <AccessoryItem accessory={clothing.accessory} topColor={clothing.topColor} />

      {/* ---- Clothing Extras ---- */}
      {clothing.bottom !== 'none' && <Belt color={clothing.bottomColor} />}
      {clothing.top === 'armor' && <ShoulderPads color={clothing.topColor} />}
    </group>
  );
};

HumanoidModel.displayName = 'HumanoidModel';

useGLTF.preload(MODEL_PATH);

export default HumanoidModel;
