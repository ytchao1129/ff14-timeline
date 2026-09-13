import { useCallback, useEffect, useState } from 'react'
import { loadThemePreference, resolveTheme, saveThemePreference } from '../lib/theme'
import type { ThemePreference } from '../lib/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Tracks the chosen theme, follows system changes, and applies data-theme on <html>. */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => loadThemePreference())
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
  )

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved = resolveTheme(preference, systemPrefersDark)

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    saveThemePreference(next)
  }, [])

  return { preference, resolved, setPreference }
}
