import { describe, expect, it } from 'vitest'
import type { SkillDef, SkillEntry } from '../types/timeline'
import { analyzeSkillUsage, describeConflict } from './cooldowns'

function skill(id: string, recastSec: number, charges?: number): SkillDef {
  return { id, job: 'WHM', name: id, nameEn: id, category: 'utility', recastSec, charges }
}

function use(id: string, timeSec: number, skillId?: string): SkillEntry {
  return { id, timeSec, label: id, skillId }
}

describe('analyzeSkillUsage', () => {
  it('reports a single-charge skill used again before it is ready', () => {
    const result = analyzeSkillUsage(
      [use('a', 0, 's'), use('b', 60, 's'), use('c', 90, 's')],
      [skill('s', 90)],
    )
    expect(result.conflicts).toEqual(new Map([['b', 90]]))
    expect(result.cooldowns).toEqual([
      { entryId: 'a', startSec: 0, endSec: 90 },
      { entryId: 'c', startSec: 90, endSec: 180 },
    ])
  })

  it('does not spend a charge on a conflicting use', () => {
    const result = analyzeSkillUsage(
      [use('a', 0, 's'), use('b', 50, 's'), use('c', 90, 's')],
      [skill('s', 90)],
    )
    expect([...result.conflicts.keys()]).toEqual(['b'])
  })

  it('allows a use exactly when the skill becomes ready, despite floating point noise', () => {
    const result = analyzeSkillUsage([use('a', 0.1, 's'), use('b', 0.1 + 0.2, 's')], [skill('s', 0.2)])
    expect(result.conflicts.size).toBe(0)
  })

  it('recovers charges one at a time', () => {
    const result = analyzeSkillUsage(
      [use('a', 0, 's'), use('b', 10, 's'), use('c', 30, 's'), use('d', 60, 's'), use('e', 100, 's')],
      [skill('s', 60, 2)],
    )
    // a, b spend both charges; the first returns at 60, the second at 120.
    expect(result.conflicts).toEqual(new Map([['c', 60], ['e', 120]]))
    expect(result.cooldowns).toEqual([
      { entryId: 'b', startSec: 10, endSec: 60 },
      { entryId: 'd', startSec: 60, endSec: 120 },
    ])
  })

  it('refills all charges after enough idle time', () => {
    const result = analyzeSkillUsage(
      [use('a', 0, 's'), use('b', 1, 's'), use('c', 200, 's'), use('d', 201, 's')],
      [skill('s', 60, 2)],
    )
    expect(result.conflicts.size).toBe(0)
  })

  it('tracks each skill separately and sorts entries by time', () => {
    const result = analyzeSkillUsage(
      [use('b2', 30, 'b'), use('a1', 0, 'a'), use('b1', 0, 'b')],
      [skill('a', 60), skill('b', 60)],
    )
    expect([...result.conflicts.keys()]).toEqual(['b2'])
  })

  it('handles prepull uses', () => {
    const result = analyzeSkillUsage([use('a', -16, 's'), use('b', 5, 's')], [skill('s', 20)])
    expect(result.conflicts.size).toBe(0)
  })

  it('ignores custom entries and skills that are not available', () => {
    const result = analyzeSkillUsage(
      [use('a', 0), use('b', 1), use('c', 2, 'missing'), use('d', 3, 'missing')],
      [skill('s', 60)],
    )
    expect(result).toEqual({ cooldowns: [], conflicts: new Map() })
  })
})

describe('describeConflict', () => {
  it('shows the remaining wait and the ready time', () => {
    expect(describeConflict(60, 90)).toBe('冷卻中，還差 30 秒（1:30 可用）')
    expect(describeConflict(10.2, 12)).toBe('冷卻中，還差 1.8 秒（0:12 可用）')
  })
})
