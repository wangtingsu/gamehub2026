/**
 * STLExport - 3D 场景 STL 导出工具
 *
 * 将 Three.js 场景导出为二进制 STL 格式文件，
 * 用于 3D 打印或与其他 3D 建模软件交换数据。
 * 使用 three-stdlib 的 STLExporter 进行导出。
 */
import * as THREE from 'three';

/**
 * 将 Three.js 场景导出为二进制 STL 文件的 Blob 对象
 * 自动更新场景的世界矩阵，然后使用 STLExporter 解析
 * @param scene - Three.js 场景对象
 * @returns 包含 STL 数据的 Blob
 */
export function exportSceneToSTL(scene: THREE.Scene): Blob {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { STLExporter } = require('three-stdlib');
  const exporter = new STLExporter();

  // Apply world matrix to all objects before export
  scene.updateMatrixWorld(true);

  // Export as binary STL
  const result = exporter.parse(scene, { binary: true });

  return new Blob([result], { type: 'application/octet-stream' });
}
