import { describe, expect, it } from 'vitest'
import { createSampleEncounter } from '../data/sample'
import type { Encounter } from '../types/timeline'
import {
  addBossAction,
  createEncounter,
  formatCastLength,
  lastBossActionEndSec,
  removeBossAction,
  updateBossAction,
  updateEncounterInfo,
} from './encounterOps'
import { parseSaveData } from './validate'

function emptyEncounter(): Encounter {
  return createEncounter({ name: '副本', durationSec: 600 })
}

describe('createEncounter', () => {
  it('creates an encounter with one empty player plan that passes validation', () => {
    const encounter = emptyEncounter()
    expect(encounter).toMatchObject({ name: '副本', durationSec: 600, bossActions: [] })
    expect(encounter.players).toHaveLength(1)
    expect(parseSaveData({ version: 1, encounters: [encounter] }).ok).toBe(true)
  })
})

describe('updateEncounterInfo', () => {
  it('changes name and duration without touching other data', () => {
    const encounter = createSampleEncounter()
    const updated = updateEncounterInfo(encounter, { name: '新名稱', durationSec: 700 })
    expect(updated).toEqual({ ...encounter, name: '新名稱', durationSec: 700 })
  })
})

describe('boss action operations', () => {
  it('adds actions sorted by start time', () => {
    let encounter = emptyEncounter()
    encounter = addBossAction(encounter, { name: 'B', castStartSec: 30, castEndSec: 35 }, 'b')
    encounter = addBossAction(encounter, { name: 'A', castStartSec: 10, castEndSec: 10 }, 'a')
    expect(encounter.bossActions.map((a) => a.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the original encounter', () => {
    const encounter = emptyEncounter()
    addBossAction(encounter, { name: 'A', castStartSec: 1, castEndSec: 2 })
    expect(encounter.bossActions).toEqual([])
  })

  it('updates an action, re-sorts, and keeps details', () => {
    let encounter = emptyEncounter()
    encounter = addBossAction(encounter, { name: 'A', castStartSec: 10, castEndSec: 12 }, 'a')
    encounter = addBossAction(encounter, { name: 'B', castStartSec: 20, castEndSec: 22 }, 'b')
    encounter.bossActions[0].details = { damageType: 'magical' }

    const updated = updateBossAction(encounter, 'a', {
      name: 'A2',
      castStartSec: 30,
      castEndSec: 31,
    })
    expect(updated.bossActions.map((a) => a.id)).toEqual(['b', 'a'])
    expect(updated.bossActions[1]).toEqual({
      id: 'a',
      name: 'A2',
      castStartSec: 30,
      castEndSec: 31,
      details: { damageType: 'magical' },
    })
  })

  it('removes a note that was cleared in the form', () => {
    let encounter = emptyEncounter()
    encounter = addBossAction(
      encounter,
      { name: 'A', castStartSec: 1, castEndSec: 2, note: '備註' },
      'a',
    )
    const updated = updateBossAction(encounter, 'a', { name: 'A', castStartSec: 1, castEndSec: 2 })
    expect(updated.bossActions[0]).not.toHaveProperty('note')
  })

  it('removes an action by id', () => {
    const encounter = createSampleEncounter()
    const target = encounter.bossActions[1]
    const updated = removeBossAction(encounter, target.id)
    expect(updated.bossActions).toHaveLength(encounter.bossActions.length - 1)
    expect(updated.bossActions.some((a) => a.id === target.id)).toBe(false)
  })

  it('finds the last action end time', () => {
    expect(lastBossActionEndSec(emptyEncounter())).toBe(0)
    let encounter = emptyEncounter()
    encounter = addBossAction(encounter, { name: 'A', castStartSec: 50, castEndSec: 90 })
    encounter = addBossAction(encounter, { name: 'B', castStartSec: 60, castEndSec: 70 })
    expect(lastBossActionEndSec(encounter)).toBe(90)
  })
})

describe('formatCastLength', () => {
  it('shows instant actions and cast lengths', () => {
    expect(formatCastLength(10, 10)).toBe('瞬發')
    expect(formatCastLength(10, 14.7)).toBe('4.7 秒')
  })
})
