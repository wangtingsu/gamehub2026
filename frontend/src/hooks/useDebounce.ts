import { useState, useEffect } from 'react';

/**
 * 防抖hook
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒），默认300ms
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器，在delay时间后更新值
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清除定时器
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}