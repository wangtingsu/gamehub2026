/**
 * 孤儿图片清理脚本
 *
 * 扫描上传目录中的所有图片，对比数据库中所有内容的引用，
 * 删除未被任何内容引用的孤儿图片。
 *
 * 用法: npx tsx scripts/cleanup-orphan-images.ts [--dry-run]
 */
import { connectDatabase } from '../src/db';
import { cleanupOrphanImages } from '../src/services/image-cleanup.service';
import logger from '../src/utils/logger';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  await connectDatabase();

  if (dryRun) {
    console.log('🔍 干运行模式 - 不会实际删除文件\n');
    // In dry run, we just show what would be cleaned
    const { getAllUploadedImages, getAllReferencedImages } = await import('../src/services/image-cleanup.service');
    const referenced = await (getAllReferencedImages as any)();
    const uploaded = (getAllUploadedImages as any)();

    const orphans: string[] = [];
    for (const fp of uploaded) {
      const urlPath = fp.replace(/\\/g, '/').replace(/.*\/uploads\//, '/uploads/');
      if (!referenced.has(urlPath)) {
        orphans.push(fp);
      }
    }

    console.log(`总上传图片: ${uploaded.length}`);
    console.log(`被引用图片: ${referenced.size}`);
    console.log(`孤儿图片: ${orphans.length}`);
    if (orphans.length > 0) {
      console.log('\n孤儿图片列表:');
      orphans.forEach(f => console.log(`  ${f}`));
      console.log(`\n运行 npx tsx scripts/cleanup-orphan-images.ts 来删除这些文件`);
    }
  } else {
    console.log('🧹 开始清理孤儿图片...\n');
    const deleted = await cleanupOrphanImages();
    console.log(`✅ 清理完成，共删除 ${deleted} 个孤儿图片`);
  }

  process.exit(0);
}

main().catch((e) => {
  logger.error('孤儿图片清理失败:', e);
  process.exit(1);
});
