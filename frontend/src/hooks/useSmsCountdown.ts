import { useState, useEffect, useCallback } from 'react'

/**
 * 短信验证码倒计时 Hook
 * @param initialSeconds 倒计时秒数，默认 60
 */
export function useSmsCountdown(initialSeconds = 60) {
  const [countdown, setCountdown] = useState(0)
  const isRunning = countdown > 0

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const start = useCallback(() => {
    setCountdown(initialSeconds)
  }, [initialSeconds])

  const reset = useCallback(() => {
    setCountdown(0)
  }, [])

  return { countdown, isRunning, start, reset }
}
