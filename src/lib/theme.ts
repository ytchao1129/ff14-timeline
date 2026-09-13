import type { StorageLike } from './storage'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type ResolvedTheme = 'light' | 'dark'

/** Also read by the inline script in index.html; keep both in sync. */
export const THEME_STORAGE_KEY = 'ff14-timeline:theme'

export function parseThemePreference(value: string | null): ThemePreference {
  return (THEME_PREFERENCES as readonly (string | null)[]).includes(value)
    ? (value as ThemePreference)
    : 'system'
}

export function loadThemePreference(storage?: StorageLike): ThemePreference {
  try {
    return parseThemePreference((storage ?? window.localStorage).getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

/** Returns false when the preference could not be stored (e.g. storage disabled). */
export function saveThemePreference(preference: ThemePreference, storage?: StorageLike): boolean {
  try {
    ;(storage ?? window.localStorage).setItem(THEME_STORAGE_KEY, preference)
    return true
  } catch {
    return false
  }
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}
