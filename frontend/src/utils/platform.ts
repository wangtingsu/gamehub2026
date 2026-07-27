/**
 * 平台/设备检测工具
 *
 * 使用 User-Agent 嗅探识别当前运行环境。
 * 所有函数为纯函数，可安全在服务端渲染和浏览器端使用。
 */

export type PlatformType = 'ios' | 'android' | 'harmonyos' | 'windows' | 'macos' | 'linux' | 'unknown';

export type BrowserType = 'safari' | 'chrome' | 'firefox' | 'edge' | 'wechat' | 'qq' | 'unknown';

export interface PlatformInfo {
  platform: PlatformType;
  browser: BrowserType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeChat: boolean;
  isQQ: boolean;
  isPWA: boolean;
  /** iOS / Android / HarmonyOS WebView 环境 */
  isWebView: boolean;
  /** 低端设备标识（内存 < 4GB / 老芯片） */
  isLowEndDevice: boolean;
}

function getUA(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

/** 是否在浏览器环境 */
export const isBrowser = (): boolean => typeof navigator !== 'undefined';

/** 是否在 iOS 设备上 */
export const isIOS = (): boolean => {
  const ua = getUA();
  return /iPhone|iPad|iPod/i.test(ua) && !(window as any).MSStream;
};

/** 是否在 Android 设备上 */
export const isAndroid = (): boolean => {
  return /Android/i.test(getUA());
};

/** 是否在 HarmonyOS 设备上 */
export const isHarmonyOS = (): boolean => {
  const ua = getUA();
  return /HarmonyOS|Harmony/i.test(ua) || /OpenHarmony/i.test(ua);
};

/** 是否在 Windows 设备上 */
export const isWindows = (): boolean => {
  return /Windows/i.test(getUA());
};

/** 是否在 macOS 设备上 */
export const isMacOS = (): boolean => {
  return /Macintosh|Mac OS X/i.test(getUA()) && !isIOS();
};

/** 是否在移动端（手机 + 平板） */
export const isMobile = (): boolean => {
  if (!isBrowser()) return false;
  const ua = getUA();
  return /Mobile|Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
};

/** 是否在平板上 */
export const isTablet = (): boolean => {
  if (!isBrowser()) return false;
  const ua = getUA();
  return /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua));
};

/** 是否在桌面端 */
export const isDesktop = (): boolean => {
  return isBrowser() && !isMobile() && !isTablet();
};

/** 微信浏览器 */
export const isWeChat = (): boolean => {
  return /MicroMessenger/i.test(getUA());
};

/** QQ 浏览器 */
export const isQQ = (): boolean => {
  return /\bQQ\b/i.test(getUA()) && !isWeChat();
};

/** WebView 环境 */
export const isWebView = (): boolean => {
  const ua = getUA();
  return (
    /wv|WebView/i.test(ua) ||
    (isIOS() && !/Safari/i.test(ua)) ||
    (isAndroid() && /wv/i.test(ua))
  );
};

/** 是否以 PWA standalone 模式运行 */
export const isPWA = (): boolean => {
  if (!isBrowser()) return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

/** 浏览器类型 */
export const getBrowser = (): BrowserType => {
  const ua = getUA();
  if (isWeChat()) return 'wechat';
  if (isQQ()) return 'qq';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
  if (/Chrome/i.test(ua) || /CriOS/i.test(ua)) return 'chrome';
  if (/Firefox/i.test(ua) || /FxiOS/i.test(ua)) return 'firefox';
  if (/Edg/i.test(ua)) return 'edge';
  return 'unknown';
};

/** 平台类型 */
export const getPlatform = (): PlatformType => {
  if (isHarmonyOS()) return 'harmonyos';
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  if (isWindows()) return 'windows';
  if (isMacOS()) return 'macos';
  if (/Linux/i.test(getUA())) return 'linux';
  return 'unknown';
};

/** 低端设备检测（通过硬件并发 + 内存线索） */
export const isLowEndDevice = (): boolean => {
  if (!isBrowser()) return false;
  const mem = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (mem !== undefined && mem < 4) return true;
  if (cores !== undefined && cores <= 2) return true;
  return false;
};

/** 获取完整平台信息 */
export const getPlatformInfo = (): PlatformInfo => ({
  platform: getPlatform(),
  browser: getBrowser(),
  isMobile: isMobile(),
  isTablet: isTablet(),
  isDesktop: isDesktop(),
  isWeChat: isWeChat(),
  isQQ: isQQ(),
  isPWA: isPWA(),
  isWebView: isWebView(),
  isLowEndDevice: isLowEndDevice(),
});
