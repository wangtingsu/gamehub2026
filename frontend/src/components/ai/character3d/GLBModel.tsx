/**
 * GLBModel - 3D 模型加载与渲染组件
 *
 * 加载并渲染外部 GLB/GLTF 3D 模型文件：
 * - 自动居中：将模型包围盒中心移动到原点
 * - 自动缩放：将模型的最大尺寸适配到指定范围
 * - 支持自定义位置、旋转和缩放
 */
import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/** GLBModel 组件的属性接口 */
interface GLBModelProps {
  url: string;                                          // GLB 模型文件的 URL
  position?: [number, number, number];                  // 模型位置（默认 [0,0,0]）
  rotation?: [number, number, number];                  // 模型旋转（默认 [0,0,0]）
  scale?: number;                                       // 自定义缩放（可选，不指定则自动缩放）
  maxDimension?: number;                                // 自动缩放的最大尺寸限制（默认 1.2）
}

/**
 * GLBModel 主组件
 * 加载 GLB 模型并自动居中/缩放后渲染到场景中
 */
const GLBModel: React.FC<GLBModelProps> = ({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale: userScale,
  maxDimension = 1.2,
}) => {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Center the model at its bounding box center
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Position correction so the model sits on the ground plane
    scene.position.set(-center.x, -center.y, -center.z);
  }, [scene]);

  // Auto-scale: compute uniform scale so max dimension fits maxDimension
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 0.001);
  const computedScale = userScale ?? (maxDimension / maxSize);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={scene} scale={computedScale} />
    </group>
  );
};

export default GLBModel;
