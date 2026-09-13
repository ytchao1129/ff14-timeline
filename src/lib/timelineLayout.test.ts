import { describe, expect, it } from 'vitest'
import type { BossAction, SkillEntry } from '../types/timeline'
import {
  assignLanes,
  estimateLabelPx,
  layoutBossActions,
  layoutSkillEntries,
} from './timelineLayout'

const range = { startSec: -16, endSec: 600 }

function action(id: string, start: number, end: number, name = 'A'): BossAction {
  return { id, name, castStartSec: start, castEndSec: end }
}

function entry(id: string, timeSec: number, label = 'A'): SkillEntry {
  return { id, timeSec, label }
}

describe('assignLanes', () => {
  it('keeps non-overlapping spans on one lane', () => {
    const result = assignLanes([
      { startPx: 0, endPx: 10 },
      { startPx: 20, endPx: 30 },
    ])
    expect(result).toEqual({ lanes: [0, 0], laneCount: 1 })
  })

  it('moves overlapping spans to new lanes and reuses freed lanes', () => {
    const result = assignLanes([
      { startPx: 0, endPx: 100 },
      { startPx: 50, endPx: 80 },
      { startPx: 90, endPx: 120 },
    ])
    expect(result).toEqual({ lanes: [0, 1, 1], laneCount: 2 })
  })

  it('does not depend on input order', () => {
    const result = assignLanes([
      { startPx: 50, endPx: 80 },
      { startPx: 0, endPx: 100 },
    ])
    expect(result.lanes).toEqual([1, 0])
  })

  it('reports at least one lane for empty input', () => {
    expect(assignLanes([])).toEqual({ lanes: [], laneCount: 1 })
  })
})

describe('estimateLabelPx', () => {
  it('counts wide characters wider than ASCII', () => {
    expect(estimateLabelPx('王王')).toBeGreaterThan(estimateLabelPx('ab'))
  })
})

describe('layoutBossActions', () => {
  it('positions cast bars by start time and cast length', () => {
    const { items } = layoutBossActions([action('a', 10, 15)], range, 8)
    expect(items[0]).toMatchObject({ leftPx: 208, widthPx: 40, instant: false, lane: 0 })
  })

  it('draws the name after the bar only when it does not fit inside', () => {
    const short = layoutBossActions([action('a', 10, 12, '很長的招式名稱')], range, 8)
    const long = layoutBossActions([action('a', 10, 30, '很長的招式名稱')], range, 8)
    expect(short.items[0].labelOutside).toBe(true)
    expect(long.items[0].labelOutside).toBe(false)
  })

  it('marks actions with equal start and end as instant', () => {
    const { items } = layoutBossActions([action('a', 10, 10)], range, 8)
    expect(items[0]).toMatchObject({ instant: true, widthPx: 0 })
  })

  it('stacks overlapping casts', () => {
    const { items, laneCount } = layoutBossActions(
      [action('a', 10, 20), action('b', 12, 18)],
      range,
      8,
    )
    expect(items.map((i) => i.lane)).toEqual([0, 1])
    expect(laneCount).toBe(2)
  })

  it('stacks short casts whose labels would overlap', () => {
    const { laneCount } = layoutBossActions(
      [action('a', 10, 11, '很長的招式名稱'), action('b', 12, 13, '另一個招式')],
      range,
      2,
    )
    expect(laneCount).toBe(2)
  })
})

describe('layoutSkillEntries', () => {
  it('positions entries, including prepull ones', () => {
    const { items } = layoutSkillEntries([entry('a', -16), entry('b', 0)], range, 8)
    expect(items.map((i) => i.leftPx)).toEqual([0, 128])
  })

  it('stacks entries whose labels overlap', () => {
    const { items } = layoutSkillEntries([entry('a', 0, '技能一'), entry('b', 1, '技能二')], range, 8)
    expect(items.map((i) => i.lane)).toEqual([0, 1])
  })

  it('gives each group its own lines in order of first use', () => {
    const entries = [entry('a', 0, 'A'), entry('b', 100, 'B'), entry('c', 200, 'A2')]
    const group = (e: SkillEntry) => (e.id === 'b' ? 'skill-b' : 'skill-a')
    const { items, laneCount } = layoutSkillEntries(entries, range, 8, group)
    expect(items.map((i) => i.lane)).toEqual([0, 1, 0])
    expect(laneCount).toBe(2)
  })

  it('stacks overlapping labels inside a group without affecting other groups', () => {
    const entries = [entry('a', 0, '技能一'), entry('b', 1, '技能一'), entry('c', 0, '別的')]
    const group = (e: SkillEntry) => (e.id === 'c' ? 'other' : 'same')
    const { items, laneCount } = layoutSkillEntries(entries, range, 8, group)
    expect(items.map((i) => i.lane)).toEqual([0, 1, 2])
    expect(laneCount).toBe(3)
  })
})
