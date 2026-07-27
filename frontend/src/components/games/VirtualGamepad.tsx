/**
 * VirtualGamepad.tsx - 虚拟手柄游戏控制器组件
 *
 * 功能概述：
 * 为触屏设备和需要辅助控制的玩家提供屏幕上的虚拟方向键和操作按钮。
 * 布局采用 D-Pad（十字方向键）风格，上/下/左/右四个方向键围绕中心排列，
 * 中间位置可放置特殊操作键（如射击）。
 * 右侧可附加自定义操作按钮（如"射击"、"落下"等）。
 * 组件会阻止触摸事件的默认行为（滚动/缩放），
 * 并阻止事件冒泡，避免与父级游戏组件的滑动控制产生冲突。
 */
import { useRef, useEffect } from 'react';

/** 方向键回调映射接口 */
interface DirectionHandlers {
  up?: () => void;
  down?: () => void;
  left?: () => void;
  right?: () => void;
  fire?: () => void;
}

/** 操作按钮配置接口 */
interface ActionButton {
  label: string;      // 按钮显示文字
  action: () => void; // 点击回调
  color?: string;     // 可选自定义颜色
}

/** 虚拟手柄组件属性接口 */
interface VirtualGamepadProps {
  directions: DirectionHandlers;  // 方向键回调
  actions?: ActionButton[];       // 可选的操作按钮列表
}

/** 按钮基础样式类（Tailwind CSS） */
const btnBase =
  'w-12 h-12 sm:w-14 sm:h-14 rounded-xl text-white text-xl sm:text-2xl font-bold ' +
  'flex items-center justify-center select-none touch-none ' +
  'bg-dark-600/80 active:bg-primary-600/90 ' +
  'border border-dark-500/50 active:border-primary-500/50 ' +
  'shadow-lg active:shadow-inner transition-all duration-75';

/**
 * VirtualGamepad 虚拟手柄组件
 *
 * 渲染一个 D-Pad 风格的方向键区域，支持四个方向键和一个中央功能键。
 * 右侧可以附加自定义操作按钮。适用于触屏设备上的游戏操控。
 *
 * 设计要点：
 * - 使用 `touch-action: none` 阻止浏览器默认触摸行为（滚动/缩放）
 * - 阻止触摸事件冒泡，避免与父级组件（如游戏滑动手势）产生冲突
 * - 同时支持触摸和鼠标点击事件
 */
const VirtualGamepad = ({ directions, actions }: VirtualGamepadProps) => {
  const padRef = useRef<HTMLDivElement>(null);

  /**
   * 阻止浏览器在游戏手柄区域内的触摸默认行为（缩放/滚动）
   * 使用 passive: false 确保 preventDefault() 生效
   */
  useEffect(() => {
    const el = padRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchstart', prevent, { passive: false });
    el.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      el.removeEventListener('touchstart', prevent);
      el.removeEventListener('touchmove', prevent);
    };
  }, []);

  /**
   * 事件处理包装函数
   * 阻止事件默认行为和冒泡，确保游戏组件中的窗口级滑动处理程序
   * 不会被虚拟手柄的触摸事件触发。
   * @param fn 要执行的回调函数
   * @returns 事件处理函数
   */
  const fire = (fn: (() => void) | undefined) =>
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      if ('nativeEvent' in e && e.nativeEvent instanceof Event) {
        e.nativeEvent.stopPropagation();
      }
      fn?.();
    };

  return (
    <div
      ref={padRef}
      className="flex items-end justify-between w-full max-w-[400px] mx-auto mt-3 select-none touch-none"
      style={{ touchAction: 'none' }}
    >
      {/* ====== D-Pad 方向键区域 ====== */}
      {/* 使用 3x3 CSS Grid 布局，方向键位于上下左右四个位置 */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        {/* 左上角空白占位 */}
        <div />
        {/* 上方向键 */}
        <button
          className={`${btnBase} row-start-1 col-start-2`}
          onMouseDown={fire(directions.up)}
          onTouchStart={fire(directions.up)}
        >
          ▲
        </button>
        <div />

        {/* 左方向键 */}
        <button
          className={`${btnBase} row-start-2 col-start-1`}
          onMouseDown={fire(directions.left)}
          onTouchStart={fire(directions.left)}
        >
          ◀
        </button>
        {/* 中央功能键（如有 fire 回调则显示闪电按钮） */}
        {directions.fire ? (
          <button
            className={`${btnBase} row-start-2 col-start-2`}
            onMouseDown={fire(directions.fire)}
            onTouchStart={fire(directions.fire)}
          >
            ⚡
          </button>
        ) : (
          <div />
        )}
        {/* 右方向键 */}
        <button
          className={`${btnBase} row-start-2 col-start-3`}
          onMouseDown={fire(directions.right)}
          onTouchStart={fire(directions.right)}
        >
          ▶
        </button>

        <div />
        {/* 下方向键 */}
        <button
          className={`${btnBase} row-start-3 col-start-2`}
          onMouseDown={fire(directions.down)}
          onTouchStart={fire(directions.down)}
        >
          ▼
        </button>
        <div />
      </div>

      {/* ====== 右侧操作按钮区域 ====== */}
      {actions && actions.length > 0 && (
        <div className="flex items-end gap-2">
          {actions.map((btn, i) => (
            <button
              key={i}
              className={
                'px-3 h-10 sm:h-12 rounded-xl text-sm sm:text-base font-bold ' +
                'flex items-center justify-center select-none touch-none ' +
                'border shadow-lg active:shadow-inner transition-all duration-75 ' +
                (btn.color
                  ? btn.color
                  : 'bg-dark-600/80 text-yellow-400 border-dark-500/50 active:bg-primary-600/90')
              }
              onMouseDown={fire(btn.action)}
              onTouchStart={fire(btn.action)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VirtualGamepad;
