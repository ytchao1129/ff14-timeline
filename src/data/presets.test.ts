import { describe, expect, it } from 'vitest'
import { PRESETS } from './presets'

describe('bundled presets', () => {
  it('loads every file in presets/ without errors', () => {
    expect(PRESETS.errors).toEqual([])
  })

  it('gives every preset a unique key', () => {
    const keys = PRESETS.encounters.map((preset) => preset.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
