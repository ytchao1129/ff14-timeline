import { describe, expect, it } from 'vitest'
import { describeDetails, formatDamage } from './bossActionLabels'

describe('formatDamage', () => {
  it('adds thousands separators', () => {
    expect(formatDamage(0)).toBe('0')
    expect(formatDamage(120000)).toBe('120,000')
  })
})

describe('describeDetails', () => {
  it('joins every field that is set', () => {
    expect(describeDetails({ damageType: 'magical', target: 'raidwide', damage: 120000 })).toBe(
      '魔法 · 全體 · 120,000',
    )
  })

  it('skips missing fields but keeps a zero damage value', () => {
    expect(describeDetails({ target: 'tank' })).toBe('坦克')
    expect(describeDetails({ damageType: 'physical', damage: 0 })).toBe('物理 · 0')
  })

  it('returns an empty string for empty details', () => {
    expect(describeDetails({})).toBe('')
  })
})
