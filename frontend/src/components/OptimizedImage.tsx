import { useState } from 'react';

/**
 * OptimizedImage 组件的属性接口
 *
 * @property src - 图片源路径（支持本地和外部 URL）
 * @property alt - 图片替代文本（无障碍访问必填）
 * @property className - 自定义 CSS 类名
 * @property width - 图片宽度（数字表示像素，字符串表示百分比等 CSS 单位）
 * @property height - 图片高度（数字表示像素，字符串表示百分比等 CSS 单位）
 * @property lazy - 是否启用懒加载，默认为 true
 * @property placeholderColor - 图片加载前的占位背景色，默认为 '#1e293b'
 * @property fallbackSrc - 加载失败时的备选图片路径
 * @property objectFit - CSS object-fit 属性，控制图片裁剪/缩放模式
 * @property srcSet - 响应式图片的 srcSet 属性，用于不同分辨率提供不同图片
 * @property sizes - 响应式图片的 sizes 属性，配合 srcSet 使用
 * @property imgProps - 透传给底层 <img> 标签的额外属性
 */
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  /** 是否懒加载 */
  lazy?: boolean;
  /** 图片占位符背景色 */
  placeholderColor?: string;
  /** 加载失败时的回退图片 */
  fallbackSrc?: string;
  /** 图片裁剪/缩放模式 */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** 响应式 srcSet */
  srcSet?: string;
  /** sizes 属性 */
  sizes?: string;
  /** 额外的 img 属性 */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}

/**
 * OptimizedImage — 支持 webp/avif 自动降级的图片组件
 *
 * 核心功能：
 * - 使用 <picture> 元素自动检测浏览器对 webp/avif 的支持，按优先级（avif > webp > 原始格式）提供图片
 * - 支持 IntersectionObserver 原生的懒加载（loading="lazy"）
 * - 支持 srcSet 和 sizes 实现响应式图片
 * - 对 Unsplash 等外部 CDN 自动添加格式转换参数
 * - 加载失败时自动回退到 fallback 图片
 * - 加载过程中显示淡入动画效果
 *
 * @param props - 组件属性，详见 OptimizedImageProps 接口
 * @returns 包含 <picture> 元素及其子 <source> 和 <img> 的 React 元素
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  lazy = true,
  placeholderColor = '#1e293b',
  fallbackSrc,
  objectFit = 'cover',
  srcSet,
  sizes,
  imgProps,
}: OptimizedImageProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  /**
   * 从原始图片路径生成 WebP 格式的图片路径
   *
   * 处理逻辑：
   * - 对于外部 URL（http/https 开头）：
   *   - 如果是 Unsplash CDN 且未指定格式参数，自动添加 fm=webp&q=80 参数
   *   - 其他外部 URL 直接返回原路径
   * - 对于本地资源：将 .png/.jpg/.jpeg 扩展名替换为 .webp
   *
   * @param originalSrc - 原始图片源路径
   * @returns WebP 格式的图片路径，若路径无效则返回原始值
   */
  const getWebpSrc = (originalSrc: string): string => {
    if (!originalSrc) return originalSrc;
    // 如果是外部 URL（http/https），构建查询参数方式请求 webp
    if (originalSrc.startsWith('http')) {
      // 对于 unsplash 等支持格式转换的 CDN
      if (originalSrc.includes('unsplash.com') && !originalSrc.includes('fm=')) {
        const separator = originalSrc.includes('?') ? '&' : '?';
        return `${originalSrc}${separator}fm=webp&q=80`;
      }
      return originalSrc;
    }
    // 本地资源：替换扩展名
    return originalSrc.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  };

  const displaySrc = imgError && fallbackSrc ? fallbackSrc : src;
  const webpSrc = getWebpSrc(displaySrc);

  // 生成 srcSet webp 版本
  const webpSrcSet = srcSet
    ? srcSet
        .split(', ')
        .map((entry) => {
          const [url, descriptor] = entry.split(' ');
          const webpUrl = getWebpSrc(url);
          return `${webpUrl} ${descriptor}`;
        })
        .join(', ')
    : undefined;

  return (
    <picture>
      {/* AVIF (最优先) — 仅对外部支持格式转换的 CDN */}
      {displaySrc.startsWith('http') && (
        <source
          srcSet={
            srcSet
              ? srcSet
                  .split(', ')
                  .map((entry) => {
                    const [url, descriptor] = entry.split(' ');
                    const avifUrl = url.includes('unsplash.com')
                      ? `${url}${url.includes('?') ? '&' : '?'}fm=avif&q=70`
                      : url;
                    return `${avifUrl} ${descriptor}`;
                  })
                  .join(', ')
              : displaySrc.includes('unsplash.com')
                ? `${displaySrc}${displaySrc.includes('?') ? '&' : '?'}fm=avif&q=70`
                : displaySrc
          }
          sizes={sizes}
          type="image/avif"
        />
      )}
      {/* WebP */}
      <source
        srcSet={webpSrcSet || webpSrc}
        sizes={sizes}
        type="image/webp"
      />
      {/* Fallback: 原始格式 */}
      <img
        src={displaySrc}
        alt={alt}
        className={className}
        width={typeof width === 'number' ? width : undefined}
        height={typeof height === 'number' ? height : undefined}
        style={{
          objectFit,
          width: typeof width === 'string' ? width : undefined,
          height: typeof height === 'string' ? height : undefined,
          backgroundColor: placeholderColor,
          opacity: imgLoaded ? 1 : 0.6,
          transition: 'opacity 0.3s ease',
        }}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
        {...imgProps}
      />
    </picture>
  );
}
