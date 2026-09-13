import { describe, expect, it } from 'vitest'
import type { StorageLike } from './storage'
import {
  THEME_STORAGE_KEY,
  loadThemePreference,
  parseThemePreference,
  resolveTheme,
  saveThemePreference,
} from './theme'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('parseThemePreference', () => {
  it('accepts known values and falls back to system', () => {
    expect(parseThemePreference('dark')).toBe('dark')
    expect(parseThemePreference('light')).toBe('light')
    expect(parseThemePreference('system')).toBe('system')
    expect(parseThemePreference(null)).toBe('system')
    expect(parseThemePreference('purple')).toBe('system')
  })
})

describe('load / save theme preference', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage()
    expect(loadThemePreference(storage)).toBe('system')
    expect(saveThemePreference('dark', storage)).toBe(true)
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark')
    expect(loadThemePreference(storage)).toBe('dark')
  })

  it('does not throw when storage is unavailable', () => {
    expect(loadThemePreference(brokenStorage)).toBe('system')
    expect(saveThemePreference('light', brokenStorage)).toBe(false)
  })
})

describe('resolveTheme', () => {
  it('follows the system only for the system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
