/**
 * LevelBadge（等级徽章）组件
 *
 * 用于显示用户等级徽章，带有等级对应颜色和可选的皇冠图标。
 * 支持悬停 Tooltip 显示详细经验值（XP）信息。
 * 通常在用户头像、评论区、用户信息卡片等处使用。
 *
 * 等级颜色映射（1-10 级）：
 * 1-灰色、2-绿色、3-青色、4-蓝色、5-紫色、
 * 6-粉色、7-橙色、8-橙红、9-红色、10-金色
 */

import React from 'react';
import { Tooltip } from 'antd';
import { CrownOutlined } from '@ant-design/icons';

/**
 * LevelBadge 组件的属性类型定义
 *
 * @property level - 用户等级（1-10），对应不同的徽章颜色
 * @property showIcon - 是否显示皇冠图标（可选，默认 true）
 * @property size - 徽章尺寸（可选，"small" 或 "default"，默认 "default"）
 * @property xp - 当前经验值（可选），用于 Tooltip 显示
 * @property xpProgress - 当前经验值进度比例（可选，0-1 之间的值），显示百分比
 * @property nextLevelXp - 升级所需总经验值（可选），用于 Tooltip 显示
 */
interface LevelBadgeProps {
  level: number;
  showIcon?: boolean;
  size?: 'small' | 'default';
  xp?: number;
  xpProgress?: number;
  nextLevelXp?: number;
}

/**
 * 等级与颜色的映射表
 * 键为等级（1-10），值为对应的 Ant Design 色值。
 * 等级越高颜色越醒目，从灰色渐变到金色。
 */
const levelColors: Record<number, string> = {
  1: '#8c8c8c',
  2: '#73d13d',
  3: '#36cfc9',
  4: '#4096ff',
  5: '#9254de',
  6: '#f759ab',
  7: '#fa8c16',
  8: '#fa541c',
  9: '#f5222d',
  10: '#faad14',
};

/**
 * LevelBadge 组件
 *
 * 渲染用户等级徽章，格式为 "Lv.{n}"，带颜色标识。
 * 悬停时弹出 Tooltip 显示详细经验值信息。
 * 支持 small 和 default 两种尺寸，可配置是否显示皇冠图标。
 *
 * @param props.level - 用户等级（必填）
 * @param props.showIcon - 是否显示皇冠图标（可选，默认 true）
 * @param props.size - 徽章尺寸（可选，"small" 或 "default"）
 * @param props.xp - 当前经验值（可选）
 * @param props.xpProgress - 经验值进度比例（可选）
 * @param props.nextLevelXp - 升级所需经验值（可选）
 *
 * @example
 * <LevelBadge level={5} />                          // 5级紫色徽章
 * <LevelBadge level={3} size="small" />             // 小尺寸3级徽章
 * <LevelBadge level={8} xp={750} nextLevelXp={1000} xpProgress={0.75} />  // 带经验值详情
 */
const LevelBadge: React.FC<LevelBadgeProps> = ({ level, showIcon = true, size = 'default', xp, xpProgress, nextLevelXp }) => {
  const color = levelColors[level] || levelColors[1];
  const isSmall = size === 'small';

  const tooltipTitle = xp !== undefined
    ? `Lv.${level} · XP: ${xp}${nextLevelXp ? ` / ${nextLevelXp}` : ''}${xpProgress !== undefined ? ` (${Math.round(xpProgress * 100)}%)` : ''}`
    : `Lv.${level} 用户`;

  return (
    <Tooltip title={tooltipTitle}>
      <span
        className={isSmall ? 'text-xs px-1 py-0' : 'font-bold'}
        style={{
          fontSize: isSmall ? 10 : 12,
          lineHeight: isSmall ? '16px' : '20px',
          backgroundColor: color,
          color: '#fff',
          padding: '2px 8px',
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {showIcon && <CrownOutlined />}
        Lv.{level}
      </span>
    </Tooltip>
  );
};

export default LevelBadge;
