/**
 * useTheme — 主题管理 hook
 *
 * 支持三种模式: dark / light / system
 * 通过 document.documentElement.classList 切换 dark class
 * 选择持久化到 electron-store
 */

import { useState, useEffect, useCallback } from 'react'
import { getApi } from '@/lib/ipc'

type ThemeMode = 'dark' | 'light' | 'system'

function applyTheme(isDark: boolean): void {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme(): {
  theme: ThemeMode
  isDark: boolean
  setTheme: (theme: ThemeMode) => void
} {
  const [theme, setThemeState] = useState<ThemeMode>('dark')
  const [isDark, setIsDark] = useState(true)

  // Load saved theme on mount
  useEffect(() => {
    const api = getApi()
    if (!api) return

    api.theme.get().then((res) => {
      if (res.success && res.data) {
        const saved = res.data.theme as ThemeMode
        setThemeState(saved)

        if (saved === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          setIsDark(prefersDark)
          applyTheme(prefersDark)
        } else {
          const dark = saved === 'dark'
          setIsDark(dark)
          applyTheme(dark)
        }
      }
    }).catch(() => {})

    // Listen for theme changes from main process (e.g. system theme change)
    const unsub = api.theme.onChanged((data) => {
      const dark = data.isDark
      setIsDark(dark)
      applyTheme(dark)
      setThemeState(data.theme as ThemeMode)
    })

    return unsub
  }, [])

  // Listen for system media query changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => {
      setIsDark(e.matches)
      applyTheme(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)

    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      applyTheme(prefersDark)
    } else {
      const dark = newTheme === 'dark'
      setIsDark(dark)
      applyTheme(dark)
    }

    const api = getApi()
    if (api) {
      api.theme.set(newTheme).catch(() => {})
    }
  }, [])

  return { theme, isDark, setTheme }
}
