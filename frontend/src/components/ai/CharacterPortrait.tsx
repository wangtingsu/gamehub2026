/**
 * CharacterPortrait - AI 人物自画像组件
 *
 * 提供可视化的角色形象定制功能，包括：
 * - 预设形象快速选择（战士、法师、弓箭手等）
 * - 自定义捏脸（肤色、发型发色、眼睛、嘴巴）
 * - 3D CSS 预览（支持鼠标拖拽旋转、自动旋转、全屏预览）
 * - AI 角色背景描述生成
 * - 图片上传叠加
 * - 图转 3D 模型生成
 * - 形象保存/加载/删除（localStorage 持久化）
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Button, Radio, Input, Row, Col, Divider, Typography, message, Tooltip, Upload, Modal, Progress, Alert } from 'antd';
import {
  UserOutlined, CheckOutlined, ThunderboltOutlined,
  SaveOutlined, UploadOutlined, DeleteOutlined, RotateRightOutlined,
  UndoOutlined, FullscreenOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import { motion } from 'framer-motion';
import { useGenerateCharacterPortrait, useImageTo3d, useImageTo3dTask } from '../../api/hooks';

const { Title, Text, Paragraph } = Typography;

/* ========== 自定义选项常量 ========== */

/** 肤色色值列表 */
const SKIN_TONES = ['#fce4c8', '#f0c8a0', '#deb887', '#c68642', '#8d5524', '#3b2a1c'];
/** 发型选项 */
const HAIR_STYLES = ['short', 'long', 'ponytail', 'curly', 'bald', 'mohawk'];
/** 发色色值列表 */
const HAIR_COLORS = ['#1a1a1a', '#4a3728', '#d4a017', '#8b0000', '#ff69b4', '#00ced1'];
/** 眼睛样式（使用 emoji 表示） */
const EYE_STYLES = ['😀', '😎', '👀', '🌟', '👁️', '✨'];
/** 嘴巴样式（使用 emoji 表示） */
const MOUTH_STYLES = ['😊', '😄', '😆', '😌', '🤔', '😏'];

/** 预设形象数据：包含 id、中文标签、图标和主题色 */
const PRESET_AVATARS = [
  { id: 'warrior', label: '战士', icon: '⚔️', color: '#ff4d4f' },
  { id: 'mage', label: '法师', icon: '🔮', color: '#722ed1' },
  { id: 'archer', label: '弓箭手', icon: '🏹', color: '#52c41a' },
  { id: 'assassin', label: '刺客', icon: '🗡️', color: '#fa8c16' },
  { id: 'healer', label: '奶妈', icon: '💚', color: '#eb2f96' },
  { id: 'tanker', label: '坦克', icon: '🛡️', color: '#1677ff' },
];

/** 已保存形象的数据结构 */
interface SavedPortrait {
  id: number;
  name: string;
  selectedPreset: string | null;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  mouthStyle: string;
  description: string | null;
  customImageUrl: string | null;
  createdAt: string;
}

/** localStorage 存储键名 */
const STORAGE_KEY = 'saved_portraits';

/**
 * 颜色加深辅助函数
 * @param hex - 十六进制颜色值
 * @param amount - 加深幅度（0-255）
 * @returns 加深后的 rgb 颜色字符串
 */
const darkenColor = (hex: string, amount: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max((num >> 16) - amount, 0);
  const g = Math.max(((num >> 8) & 0xff) - amount, 0);
  const b = Math.max((num & 0xff) - amount, 0);
  return `rgb(${r},${g},${b})`;
};

// ====== CSS 3D 面部图层子组件 ======

/** CharacterFace 组件的属性接口 */
interface FaceLayerProps {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  mouthStyle: string;
}

/**
 * 面部椭圆基底组件
 * 使用径向渐变模拟 3D 立体脸部效果，包含左右腮红
 */
const FaceOval: React.FC<{ skinTone: string }> = ({ skinTone }) => (
  <div
    style={{
      transform: 'translateZ(0px)',
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        width: '65%',
        height: '78%',
        borderRadius: '50% 50% 50% 50% / 55% 55% 48% 48%',
        background: `radial-gradient(ellipse at 50% 30%, ${skinTone}cc, ${skinTone} 55%, ${darkenColor(skinTone, 25)})`,
        boxShadow: `inset 0 -8px 20px ${darkenColor(skinTone, 40)}44, 0 4px 15px rgba(0,0,0,0.1)`,
        position: 'relative',
      }}
    >
      {/* Cheek blush */}
      <div style={{ position: 'absolute', left: '10%', top: '48%', width: 22, height: 12, borderRadius: '50%', background: `${darkenColor(skinTone, 15)}55`, filter: 'blur(3px)' }} />
      <div style={{ position: 'absolute', right: '10%', top: '48%', width: 22, height: 12, borderRadius: '50%', background: `${darkenColor(skinTone, 15)}55`, filter: 'blur(3px)' }} />
    </div>
  </div>
);

/**
 * 眼睛图层组件
 * 根据 eyeStyle 渲染不同的眼睛样式：
 * - 墨镜（😎）：黑色矩形墨镜
 * - 星星/闪光眼（✨/🌟）：金色发光
 * - 大眼（👀）：更大尺寸
 * - 默认：深棕圆形
 */
const EyePair: React.FC<{ skinTone: string; eyeStyle: string }> = ({ eyeStyle }) => {
  const isSunglasses = eyeStyle === '😎';
  const isSparkle = eyeStyle === '✨' || eyeStyle === '🌟';
  const isLarge = eyeStyle === '👀';
  const size = isLarge ? 14 : 11;
  const eyeColor = isSunglasses ? '#222' : isSparkle ? '#ffd700' : '#3a281a';
  return (
    <div
      style={{
        transform: 'translateZ(10px)',
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSunglasses ? '32%' : '36%',
        paddingTop: '3%',
      }}
    >
      {/* Left eye */}
      <div style={{
        width: isSunglasses ? 32 : size,
        height: isSunglasses ? 18 : size,
        borderRadius: isSunglasses ? 4 : '50%',
        background: eyeColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isSunglasses ? 'inset 0 2px 4px rgba(255,255,255,0.2)' : `0 0 4px ${eyeColor}66`,
        position: 'relative',
      }}>
        {isSunglasses ? (
          <div style={{ width: '60%', height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 1, position: 'absolute', top: 3 }} />
        ) : (
          <div style={{
            width: '40%', height: '40%', borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: '15%', right: '15%',
          }} />
        )}
      </div>
      {/* Right eye */}
      <div style={{
        width: isSunglasses ? 32 : size,
        height: isSunglasses ? 18 : size,
        borderRadius: isSunglasses ? 4 : '50%',
        background: eyeColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isSunglasses ? 'inset 0 2px 4px rgba(255,255,255,0.2)' : `0 0 4px ${eyeColor}66`,
        position: 'relative',
      }}>
        {isSunglasses ? (
          <div style={{ width: '60%', height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 1, position: 'absolute', top: 3 }} />
        ) : (
          <div style={{
            width: '40%', height: '40%', borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: '15%', right: '15%',
          }} />
        )}
      </div>
    </div>
  );
};

/**
 * 鼻子图层组件
 * 使用半透明椭圆模拟 3D 鼻梁效果
 */
const Nose3D: React.FC = () => (
  <div
    style={{
      transform: 'translateZ(15px)',
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: '5%',
    }}
  >
    <div style={{
      width: 8, height: 12,
      borderRadius: '50% / 60% 60% 40% 40%',
      background: 'rgba(0,0,0,0.06)',
      boxShadow: '0 2px 3px rgba(0,0,0,0.05)',
    }} />
  </div>
);

/**
 * 嘴巴图层组件
 * 根据 mouthStyle 渲染不同形状的嘴巴（微笑、大笑、张嘴笑、平静、思考、歪嘴）
 */
const MouthShape: React.FC<{ mouthStyle: string }> = ({ mouthStyle }) => {
  const getMouthStyle = (): React.CSSProperties => {
    switch (mouthStyle) {
      case '😊': return { width: 26, height: 10, borderBottom: `3px solid #c47a6b`, borderRadius: '0 0 50% 50%' };
      case '😄': return { width: 32, height: 14, borderBottom: `3.5px solid #c47a6b`, borderRadius: '0 0 50% 50%' };
      case '😆': return { width: 28, height: 16, background: '#4a2820', borderRadius: '0 0 50% 50%', borderBottom: 'none' };
      case '😌': return { width: 24, height: 3, background: '#c47a6b', borderRadius: 2 };
      case '🤔': return { width: 22, height: 4, borderBottom: `2.5px solid #c47a6b`, borderRadius: '0 0 50% 50%', transform: 'translateX(-3px)' };
      case '😏': return { width: 26, height: 10, borderBottom: `3px solid #c47a6b`, borderRadius: '0 0 50% 50%', transform: 'rotate(-5deg) translateX(3px)' };
      default: return { width: 24, height: 10, borderBottom: `3px solid #c47a6b`, borderRadius: '0 0 50% 50%' };
    }
  };
  return (
    <div
      style={{
        transform: 'translateZ(12px)',
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '10.5%',
      }}
    >
      <div style={getMouthStyle()} />
    </div>
  );
};

/**
 * 头发图层组件
 * 根据 hairStyle 渲染不同发型（短发、长发、马尾、卷发、莫西干、光头）
 * 使用 CSS 绝对定位和 translateZ 实现 3D 层叠效果
 */
const HairLayer: React.FC<{ hairStyle: string; hairColor: string }> = ({ hairStyle, hairColor }) => {
  if (hairStyle === 'bald') return null;

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translateZ(25px)',
    pointerEvents: 'none',
  };

  switch (hairStyle) {
    case 'short':
      return (
        <div style={commonStyle}>
          <div style={{ width: '52%', height: '26%', background: hairColor, borderRadius: '50% 50% 0 0', position: 'absolute', top: '8%' }} />
          <div style={{ width: '48%', height: '18%', background: hairColor, borderRadius: '50%', position: 'absolute', top: '18%', left: '14%' }} />
          <div style={{ width: '48%', height: '18%', background: hairColor, borderRadius: '50%', position: 'absolute', top: '18%', right: '14%' }} />
        </div>
      );
    case 'long':
      return (
        <div style={commonStyle}>
          <div style={{ width: '56%', height: '30%', background: hairColor, borderRadius: '50% 50% 0 0', position: 'absolute', top: '5%' }} />
          <div style={{ width: '26%', height: '45%', background: hairColor, borderRadius: '30% 0 30% 0', position: 'absolute', top: '15%', left: '8%', opacity: 0.85 }} />
          <div style={{ width: '26%', height: '45%', background: hairColor, borderRadius: '0 30% 0 30%', position: 'absolute', top: '15%', right: '8%', opacity: 0.85 }} />
        </div>
      );
    case 'ponytail':
      return (
        <div style={{ ...commonStyle }}>
          <div style={{ width: '50%', height: '26%', background: hairColor, borderRadius: '50% 50% 0 0', position: 'absolute', top: '7%' }} />
          <div style={{ width: '20%', height: '18%', background: hairColor, borderRadius: '50%', position: 'absolute', top: '5%', right: '5%' }} />
          <div style={{ width: '22%', height: '35%', background: hairColor, borderRadius: '50% 0 50% 50%', position: 'absolute', top: '10%', left: '6%', opacity: 0.7 }} />
          <div style={{ width: '22%', height: '35%', background: hairColor, borderRadius: '0 50% 50% 50%', position: 'absolute', top: '10%', right: '6%', opacity: 0.7 }} />
        </div>
      );
    case 'curly':
      return (
        <div style={{ ...commonStyle }}>
          <div style={{ width: '58%', height: '22%', background: hairColor, borderRadius: '50% 50% 30% 30%', position: 'absolute', top: '6%' }} />
          <div style={{ width: 18, height: 18, background: hairColor, borderRadius: '50%', position: 'absolute', top: '12%', left: '14%' }} />
          <div style={{ width: 16, height: 16, background: hairColor, borderRadius: '50%', position: 'absolute', top: '8%', left: '20%' }} />
          <div style={{ width: 18, height: 18, background: hairColor, borderRadius: '50%', position: 'absolute', top: '12%', right: '14%' }} />
          <div style={{ width: 16, height: 16, background: hairColor, borderRadius: '50%', position: 'absolute', top: '8%', right: '20%' }} />
          <div style={{ width: 14, height: 14, background: hairColor, borderRadius: '50%', position: 'absolute', top: '15%', left: '10%' }} />
          <div style={{ width: 14, height: 14, background: hairColor, borderRadius: '50%', position: 'absolute', top: '15%', right: '10%' }} />
        </div>
      );
    case 'mohawk':
      return (
        <div style={{ ...commonStyle }}>
          <div style={{ width: '22%', height: '32%', background: hairColor, borderRadius: '30% 30% 10% 10%', position: 'absolute', top: '4%' }} />
          <div style={{ width: '26%', height: 6, background: hairColor, borderRadius: 3, position: 'absolute', top: '28%' }} />
        </div>
      );
    default:
      return null;
  }
};

/**
 * 完整角色面部组合组件
 * 将脸部各图层（面部、眼睛、鼻子、嘴巴、头发）叠加渲染，
 * 使用 preserve-3d 实现 3D 层叠效果
 */
const CharacterFace: React.FC<FaceLayerProps> = (props) => (
  <div style={{
    position: 'absolute',
    inset: 0,
    transformStyle: 'preserve-3d',
  }}>
    <FaceOval skinTone={props.skinTone} />
    <EyePair skinTone={props.skinTone} eyeStyle={props.eyeStyle} />
    <Nose3D />
    <MouthShape mouthStyle={props.mouthStyle} />
    <HairLayer hairStyle={props.hairStyle} hairColor={props.hairColor} />
  </div>
);

/**
 * CharacterPortrait 主组件
 * 包含预设选择、自定义捏脸、3D CSS 预览、AI 描述生成、图片上传、3D 模型生成、保存/加载等功能
 */
const CharacterPortrait: React.FC = () => {
  /* ====== 角色自定义状态 ====== */
  const [name, setName] = useState('');                             // 角色名称
  const [skinTone, setSkinTone] = useState(SKIN_TONES[0]);           // 肤色
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[0]);        // 发型
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);        // 发色
  const [eyeStyle, setEyeStyle] = useState(EYE_STYLES[0]);           // 眼睛样式
  const [mouthStyle, setMouthStyle] = useState(MOUTH_STYLES[0]);     // 嘴巴样式
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null); // 选中的预设形象 ID
  const [description, setDescription] = useState<string | null>(null);       // AI 生成的角色描述
  const { mutateAsync: generate, isPending } = useGenerateCharacterPortrait();

  /* ====== 3D 旋转控制状态 ====== */
  const [rotation, setRotation] = useState({ x: 0, y: 0 });         // 当前旋转角度
  const [isAutoRotate, setIsAutoRotate] = useState(false);           // 是否自动旋转
  const [isDragging, setIsDragging] = useState(false);               // 是否正在拖拽
  const dragStart = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });       // 拖拽起始位置和旋转角度
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null); // 自动旋转定时器引用

  /* ====== 全屏预览状态 ====== */
  const [previewOpen, setPreviewOpen] = useState(false);

  /* ====== 图片上传状态 ====== */
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null); // 上传的图片 URL
  const [uploading, setUploading] = useState(false);                          // 是否正在上传

  /* ====== 3D 生成状态 ====== */
  const [is3dModalOpen, setIs3dModalOpen] = useState(false);          // 3D 生成弹窗是否打开
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);    // 当前 3D 生成任务 ID
  const { mutateAsync: submit3d, isPending: is3dSubmitting } = useImageTo3d();
  const { data: taskStatus } = useImageTo3dTask(currentTaskId);

  /* ====== 已保存形象列表（localStorage 持久化） ====== */
  const [savedPortraits, setSavedPortraits] = useState<SavedPortrait[]>([]);

  /**
   * 组件挂载时从 localStorage 加载已保存的形象列表
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedPortraits(JSON.parse(stored));
      }
    } catch {
      // 忽略 JSON 解析错误
    }
  }, []);

  /**
   * 自动旋转定时器
   * 当 isAutoRotate 为 true 时，每 30ms 增加 Y 轴旋转角度 0.5 度
   */
  useEffect(() => {
    if (isAutoRotate) {
      autoRotateRef.current = setInterval(() => {
        setRotation((prev) => ({ ...prev, y: prev.y + 0.5 }));
      }, 30);
    } else {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
        autoRotateRef.current = undefined;
      }
    }
    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [isAutoRotate]);

  /** 发型 -> emoji 映射 */
  const hairEmoji: Record<string, string> = {
    short: '💇', long: '💆', ponytail: '💁', curly: '🦱', bald: '🙇', mohawk: '🤘',
  };

  /** 发型 -> 中文标签映射 */
  const hairLabel: Record<string, string> = {
    short: '短发', long: '长发', ponytail: '马尾', curly: '卷发', bald: '光头', mohawk: '莫西干',
  };

  /**
   * 选择预设形象
   * @param id - 预设形象 ID
   */
  const handlePresetSelect = (id: string) => {
    setSelectedPreset(id);
    message.success(`已选择形象：${PRESET_AVATARS.find(a => a.id === id)?.label}`);
  };

  /**
   * 调用 AI 生成角色背景描述
   * 将当前角色配置（名称、肤色、发型等）发送到后端生成描述文本
   */
  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      message.warning('请先输入角色名称');
      return;
    }
    try {
      const res = await generate({
        name: name.trim(),
        skinTone,
        hairStyle,
        hairColor,
        eyeStyle,
        mouthStyle,
        selectedPreset,
      });
      setDescription(res.description);
    } catch {
      message.error('角色描述生成失败，请稍后重试');
    }
  };

  // ====== 3D 拖拽旋转事件处理 ======

  /**
   * 鼠标/触摸按下：开始拖拽，关闭自动旋转
   */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setIsAutoRotate(false);
    dragStart.current = { x: e.clientX, y: e.clientY, rotX: rotation.x, rotY: rotation.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [rotation]);

  /**
   * 鼠标/触摸移动：根据拖拽位移计算新的旋转角度
   * X 轴旋转对应上下拖拽，Y 轴旋转对应左右拖拽
   */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotation({
      x: dragStart.current.rotX + dy * 0.5,
      y: dragStart.current.rotY + dx * 0.5,
    });
  }, [isDragging]);

  /**
   * 鼠标/触摸释放：结束拖拽
   */
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ====== 保存/加载/删除逻辑 ======

  /**
   * 保存当前形象到 localStorage
   * 将当前所有角色配置序列化为 SavedPortrait 对象并存储
   */
  const handleSave = () => {
    if (!name.trim()) {
      message.warning('请先输入角色名称');
      return;
    }
    const portrait: SavedPortrait = {
      id: Date.now(),
      name: name.trim(),
      selectedPreset,
      skinTone,
      hairStyle,
      hairColor,
      eyeStyle,
      mouthStyle,
      description,
      customImageUrl,
      createdAt: new Date().toLocaleString(),
    };
    const updated = [portrait, ...savedPortraits];
    setSavedPortraits(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    message.success('形象已保存');
  };

  /**
   * 加载已保存的形象
   * 将 SavedPortrait 的所有字段恢复到编辑器中
   * @param portrait - 要加载的已保存形象数据
   */
  const handleLoad = (portrait: SavedPortrait) => {
    setName(portrait.name);
    setSelectedPreset(portrait.selectedPreset);
    setSkinTone(portrait.skinTone);
    setHairStyle(portrait.hairStyle);
    setHairColor(portrait.hairColor);
    setEyeStyle(portrait.eyeStyle);
    setMouthStyle(portrait.mouthStyle);
    setDescription(portrait.description);
    setCustomImageUrl(portrait.customImageUrl);
    setRotation({ x: 0, y: 0 });
    message.success(`已加载形象：${portrait.name}`);
  };

  /**
   * 删除已保存的形象
   * @param id - 要删除的形象 ID
   */
  const handleDelete = (id: number) => {
    const updated = savedPortraits.filter((p) => p.id !== id);
    setSavedPortraits(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    message.success('已删除保存的形象');
  };

  // ====== 图片上传处理 ======

  /**
   * 处理图片上传
   * 使用 FileReader 将图片读取为 dataURL，用于预览和 3D 生成
   * @param file - 上传的图片文件
   * @returns false 阻止 antd Upload 的默认自动上传行为
   */
  const handleImageUpload = (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomImageUrl(e.target?.result as string);
      setUploading(false);
      message.success('图片已上传');
    };
    reader.onerror = () => {
      setUploading(false);
      message.error('图片上传失败');
    };
    reader.readAsDataURL(file);
    return false; // 阻止自动上传
  };

  /** 移除已上传的图片 */
  const handleImageRemove = () => {
    setCustomImageUrl(null);
    message.info('已移除上传的图片');
  };

  // ====== 3D 模型生成处理 ======

  /**
   * 提交图转 3D 任务
   * 将上传的图片发送到后端进行 3D 模型生成
   */
  const handleGenerate3d = async () => {
    if (!customImageUrl) {
      message.warning('请先上传图片');
      return;
    }
    try {
      const result = await submit3d(customImageUrl);
      setCurrentTaskId(result.taskId);
      setIs3dModalOpen(true);
    } catch {
      message.error('3D 生成提交失败，请稍后重试');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Title level={4} className="!mb-2">🎨 AI 人物自画像</Title>
        <Text type="secondary">打造你的专属游戏形象，支持 3D 展示与图片叠加</Text>
      </div>

      {/* 预设形象 */}
      <Card title="选择预设形象" size="small">
        <Row gutter={[12, 12]}>
          {PRESET_AVATARS.map((avatar) => (
            <Col xs={8} sm={6} md={4} key={avatar.id}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Card
                  hoverable
                  size="small"
                  className={`text-center cursor-pointer ${selectedPreset === avatar.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => handlePresetSelect(avatar.id)}
                >
                  <div className="text-3xl mb-1">{avatar.icon}</div>
                  <div className="text-xs font-medium">{avatar.label}</div>
                  {selectedPreset === avatar.id && (
                    <CheckOutlined className="text-blue-500 absolute top-1 right-1" />
                  )}
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </Card>

      <Divider plain>或</Divider>

      {/* 自定义捏脸 */}
      <Card title="自定义捏脸" size="small">
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <div className="space-y-4">
              <div>
                <Text className="block mb-2">角色名称</Text>
                <Input
                  className="max-w-[50%]"
                  placeholder="输入角色名称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  prefix={<UserOutlined />}
                />
              </div>

              <div>
                <Text className="block mb-2">肤色</Text>
                <div className="flex gap-2">
                  {SKIN_TONES.map((tone) => (
                    <div
                      key={tone}
                      className={`w-8 h-8 rounded-full cursor-pointer border-2 ${skinTone === tone ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                      style={{ backgroundColor: tone }}
                      onClick={() => setSkinTone(tone)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Text className="block mb-2">发型</Text>
                <Radio.Group value={hairStyle} onChange={(e) => setHairStyle(e.target.value)} size="small">
                  {HAIR_STYLES.map((style) => (
                    <Radio.Button key={style} value={style}>
                      {hairEmoji[style]} {hairLabel[style]}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>

              <div>
                <Text className="block mb-2">发色</Text>
                <div className="flex gap-2">
                  {HAIR_COLORS.map((color) => (
                    <div
                      key={color}
                      className={`w-8 h-8 rounded-full cursor-pointer border-2 ${hairColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setHairColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Text className="block mb-2">眼睛</Text>
                <Radio.Group value={eyeStyle} onChange={(e) => setEyeStyle(e.target.value)} size="small">
                  {EYE_STYLES.map((style) => (
                    <Radio.Button key={style} value={style}>{style}</Radio.Button>
                  ))}
                </Radio.Group>
              </div>

              <div>
                <Text className="block mb-2">嘴巴</Text>
                <Radio.Group value={mouthStyle} onChange={(e) => setMouthStyle(e.target.value)} size="small">
                  {MOUTH_STYLES.map((style) => (
                    <Radio.Button key={style} value={style}>{style}</Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            </div>
          </Col>

          {/* 3D 预览区域 */}
          <Col xs={24} md={12}>
            <div className="bg-gradient-to-b from-blue-50 to-purple-50 rounded-xl p-6 text-center">
              <div className="flex items-center justify-between mb-3">
                <Text className="font-medium">3D 形象预览</Text>
                <div className="flex gap-1">
                  <Tooltip title={isAutoRotate ? '停止旋转' : '自动旋转'}>
                    <Button
                      size="small"
                      type={isAutoRotate ? 'primary' : 'default'}
                      icon={<RotateRightOutlined />}
                      onClick={() => setIsAutoRotate(!isAutoRotate)}
                    />
                  </Tooltip>
                  <Tooltip title="全屏预览">
                    <Button
                      size="small"
                      icon={<FullscreenOutlined />}
                      onClick={() => setPreviewOpen(true)}
                    />
                  </Tooltip>
                </div>
              </div>

              {/* 3D Container - click to full preview */}
              <div
                className="w-full max-w-[280px] h-72 mx-auto cursor-pointer"
                style={{ perspective: '1000px' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onDoubleClick={() => setPreviewOpen(true)}
              >
                <motion.div
                  className="w-full h-full rounded-2xl shadow-lg relative overflow-hidden"
                  style={{
                    transform: `rotateY(${rotation.y}deg) rotateX(${rotation.x}deg)`,
                    transformStyle: 'preserve-3d',
                    transition: isDragging ? 'none' : 'transform 0.3s ease',
                    background: customImageUrl
                      ? `url(${customImageUrl}) center/cover no-repeat`
                      : 'white',
                  }}
                  animate={{ scale: [1, 1.01, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {/* Semi-transparent overlay for readability when custom image is set */}
                  {customImageUrl && (
                    <div className="absolute inset-0 bg-white/40" />
                  )}

                  {/* 3D CSS Character Face */}
                  <CharacterFace
                    skinTone={skinTone}
                    hairStyle={hairStyle}
                    hairColor={hairColor}
                    eyeStyle={eyeStyle}
                    mouthStyle={mouthStyle}
                  />

                  {/* Name label */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-medium truncate max-w-[120px] z-20" style={{ transform: 'translateZ(30px) translateX(-50%)', textShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                    {name || '未命名角色'}
                  </div>

                  {/* Drag hint */}
                  {!isDragging && rotation.y === 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap z-20" style={{ transform: 'translateZ(20px) translateX(-50%)' }}>
                      拖拽旋转
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={handleGenerateDescription}
                  loading={isPending}
                  size="small"
                >
                  生成描述
                </Button>
                <Tooltip title="上传图片作为形象背景">
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={handleImageUpload}
                    disabled={uploading}
                  >
                    <Button
                      icon={<UploadOutlined />}
                      loading={uploading}
                      size="small"
                    >
                      上传图片
                    </Button>
                  </Upload>
                </Tooltip>
                {customImageUrl && (
                  <>
                    <Tooltip title="移除上传的图片">
                      <Button
                        icon={<UndoOutlined />}
                        size="small"
                        danger
                        onClick={handleImageRemove}
                      />
                    </Tooltip>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      size="small"
                      loading={is3dSubmitting}
                      onClick={handleGenerate3d}
                    >
                      生成3D
                    </Button>
                  </>
                )}
                <Tooltip title="保存当前形象">
                  <Button
                    icon={<SaveOutlined />}
                    size="small"
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                </Tooltip>
              </div>

              {/* 图片预览 */}
              {customImageUrl && (
                <div className="mt-4">
                  <Text className="text-sm font-medium block mb-2">已选择图片预览</Text>
                  <div className="w-full max-w-[280px] mx-auto rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img
                      src={customImageUrl}
                      alt="已选择图片"
                      className="w-full h-48 object-contain bg-gray-50"
                    />
                  </div>
                </div>
              )}

              {/* Generated description */}
              {description && (
                <div className="mt-4 text-left bg-gray-50 rounded-lg p-3">
                  <Text className="text-sm font-medium block mb-1">📖 角色背景</Text>
                  <Paragraph className="text-gray-600 text-sm mb-0">{description}</Paragraph>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Saved Portraits Gallery */}
      {savedPortraits.length > 0 && (
        <Card title={`已保存形象 (${savedPortraits.length})`} size="small">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {savedPortraits.map((portrait) => (
              <motion.div
                key={portrait.id}
                className="flex-shrink-0 w-28 group relative"
                whileHover={{ y: -4 }}
              >
                <Card
                  hoverable
                  size="small"
                  className="text-center cursor-pointer"
                  onClick={() => handleLoad(portrait)}
                >
                  <div className="text-xl mb-1">{hairEmoji[portrait.hairStyle]}</div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl mx-auto shadow-inner mb-1"
                    style={{ backgroundColor: portrait.skinTone }}
                  >
                    {portrait.eyeStyle}
                  </div>
                  <div className="text-xs font-medium truncate">{portrait.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">{portrait.createdAt}</div>
                </Card>
                <Tooltip title="删除">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(portrait.id);
                    }}
                  />
                </Tooltip>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Fullscreen 360 Preview Modal */}
      <Modal
        title={
          <span>
            <RotateRightOutlined className="mr-2" />
            360° 全方位预览 — {name || '未命名角色'}
          </span>
        }
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={600}
        centered
      >
        <div className="py-6 flex flex-col items-center">
          <div
            className="w-72 h-80 mx-auto"
            style={{ perspective: '1200px', cursor: isDragging ? 'grabbing' : 'grab' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <motion.div
              className="w-full h-full rounded-2xl shadow-xl relative overflow-hidden"
              style={{
                transform: `rotateY(${rotation.y}deg) rotateX(${rotation.x}deg)`,
                transformStyle: 'preserve-3d',
                transition: isDragging ? 'none' : 'transform 0.3s ease',
                background: customImageUrl
                  ? `url(${customImageUrl}) center/cover no-repeat`
                  : 'white',
              }}
            >
              {customImageUrl && (
                <div className="absolute inset-0 bg-white/40" />
              )}
              {/* 3D CSS Character Face */}
              <CharacterFace
                skinTone={skinTone}
                hairStyle={hairStyle}
                hairColor={hairColor}
                eyeStyle={eyeStyle}
                mouthStyle={mouthStyle}
              />

              {/* Name + preset label */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center z-20" style={{ transform: 'translateZ(30px) translateX(-50%)' }}>
                <div className="text-base font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                  {name || '未命名角色'}
                </div>
                {selectedPreset && (
                  <div className="text-sm text-gray-500">
                    {PRESET_AVATARS.find(a => a.id === selectedPreset)?.icon}{' '}
                    {PRESET_AVATARS.find(a => a.id === selectedPreset)?.label}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Modal controls */}
          <div className="flex items-center gap-3 mt-6">
            <Tooltip title="自动旋转">
              <Button
                type={isAutoRotate ? 'primary' : 'default'}
                icon={<RotateRightOutlined />}
                onClick={() => setIsAutoRotate(!isAutoRotate)}
              >
                {isAutoRotate ? '停止旋转' : '自动旋转'}
              </Button>
            </Tooltip>
            <Button onClick={() => setRotation({ x: 0, y: 0 })}>
              重置视角
            </Button>
          </div>
          <Text type="secondary" className="mt-3 text-sm">
            拖拽鼠标旋转形象，滚动查看细节
          </Text>
        </div>
      </Modal>

      {/* AI 3D 生成进度 Modal */}
      <Modal
        title="🎲 3D 模型生成"
        open={is3dModalOpen}
        onCancel={() => setIs3dModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIs3dModalOpen(false)}>
            {taskStatus?.status === 'succeeded' ? '完成' : '关闭'}
          </Button>
        ]}
        width={480}
        centered
      >
        <div className="py-6 text-center">
          {!currentTaskId ? (
            <Spin tip="正在提交任务..." />
          ) : taskStatus?.status === 'pending' || taskStatus?.status === 'processing' ? (
            <div>
              <Progress
                type="circle"
                percent={taskStatus.progress || 0}
                status="active"
              />
              <p className="mt-4 text-gray-500">
                {taskStatus.status === 'pending' ? '等待处理...' : '正在生成 3D 模型...'}
              </p>
            </div>
          ) : taskStatus?.status === 'succeeded' ? (
            <div>
              <Alert
                type="success"
                message="3D 模型生成完成！"
                showIcon
                className="mb-4"
              />
              {taskStatus.modelUrls?.thumbnail && (
                <img
                  src={taskStatus.modelUrls.thumbnail}
                  alt="生成结果预览"
                  className="w-full max-w-[240px] mx-auto rounded-lg border mb-4"
                />
              )}
              {taskStatus.modelUrls?.glb && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  href={taskStatus.modelUrls.glb}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  下载 GLB 模型
                </Button>
              )}
              {taskStatus.modelUrls?.usdz && (
                <Button
                  className="ml-2"
                  icon={<DownloadOutlined />}
                  href={taskStatus.modelUrls.usdz}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  下载 USDZ
                </Button>
              )}
            </div>
          ) : taskStatus?.status === 'failed' ? (
            <Alert
              type="error"
              message="3D 模型生成失败"
              description={taskStatus.errorMessage || '请稍后重试'}
              showIcon
            />
          ) : (
            <Spin tip="查询任务状态..." />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CharacterPortrait;
