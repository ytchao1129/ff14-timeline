import { describe, expect, it } from 'vitest'
import { createSampleEncounter } from '../data/sample'
import { MAX_PLAYERS } from '../types/timeline'
import type { Encounter } from '../types/timeline'
import {
  addBossAction,
  addPlayer,
  addSkillEntry,
  countInvalidSkillEntries,
  createEncounter,
  formatCastLength,
  latestUsedSec,
  removeBossAction,
  removeSkillEntry,
  setPlayerJob,
  updateBossAction,
  updateEncounterInfo,
  updateSkillEntry,
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

  it('updates an action, re-sorts, and replaces details', () => {
    let encounter = emptyEncounter()
    encounter = addBossAction(
      encounter,
      { name: 'A', castStartSec: 10, castEndSec: 12, details: { damageType: 'magical' } },
      'a',
    )
    encounter = addBossAction(encounter, { name: 'B', castStartSec: 20, castEndSec: 22 }, 'b')
    expect(encounter.bossActions[0].details).toEqual({ damageType: 'magical' })

    const updated = updateBossAction(encounter, 'a', {
      name: 'A2',
      castStartSec: 30,
      castEndSec: 31,
      details: { target: 'tank', damage: 90000 },
    })
    expect(updated.bossActions.map((a) => a.id)).toEqual(['b', 'a'])
    expect(updated.bossActions[1]).toEqual({
      id: 'a',
      name: 'A2',
      castStartSec: 30,
      castEndSec: 31,
      details: { target: 'tank', damage: 90000 },
    })
  })

  it('removes details that were cleared in the form', () => {
    let encounter = emptyEncounter()
    encounter = addBossAction(
      encounter,
      { name: 'A', castStartSec: 1, castEndSec: 2, details: { damage: 1 } },
      'a',
    )
    const updated = updateBossAction(encounter, 'a', { name: 'A', castStartSec: 1, castEndSec: 2 })
    expect(updated.bossActions[0]).not.toHaveProperty('details')
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
})

describe('latestUsedSec', () => {
  it('uses the latest boss action end or skill time', () => {
    expect(latestUsedSec(emptyEncounter())).toBe(0)

    let encounter = emptyEncounter()
    encounter = addBossAction(encounter, { name: 'A', castStartSec: 50, castEndSec: 90 })
    encounter = addBossAction(encounter, { name: 'B', castStartSec: 60, castEndSec: 70 })
    expect(latestUsedSec(encounter)).toBe(90)

    const playerId = encounter.players[0].id
    encounter = addSkillEntry(encounter, playerId, { timeSec: 120, label: 'S' })
    expect(latestUsedSec(encounter)).toBe(120)
  })

  it('ignores prepull-only skills', () => {
    let encounter = emptyEncounter()
    encounter = addSkillEntry(encounter, encounter.players[0].id, { timeSec: -10, label: 'S' })
    expect(latestUsedSec(encounter)).toBe(0)
  })
})

describe('formatCastLength', () => {
  it('shows instant actions and cast lengths', () => {
    expect(formatCastLength(10, 10)).toBe('瞬發')
    expect(formatCastLength(10, 14.7)).toBe('4.7 秒')
  })
})

describe('addPlayer', () => {
  it('adds an empty player plan up to the maximum', () => {
    let encounter: Encounter = { ...emptyEncounter(), players: [] }
    for (let i = 0; i < MAX_PLAYERS + 2; i++) encounter = addPlayer(encounter)
    expect(encounter.players).toHaveLength(MAX_PLAYERS)
    expect(new Set(encounter.players.map((p) => p.id)).size).toBe(MAX_PLAYERS)
  })
})

describe('skill entry operations', () => {
  function twoPlayers(): Encounter {
    return addPlayer(emptyEncounter())
  }

  it('adds entries sorted by time to the chosen player only', () => {
    let encounter = twoPlayers()
    const [first, second] = encounter.players
    encounter = addSkillEntry(encounter, first.id, { timeSec: 30, label: 'B' }, 'b')
    encounter = addSkillEntry(encounter, first.id, { timeSec: -5, label: 'A' }, 'a')
    expect(encounter.players[0].entries.map((e) => e.id)).toEqual(['a', 'b'])
    expect(encounter.players[1]).toBe(second)
  })

  it('updates an entry, re-sorts, and sets or clears the skill id', () => {
    let encounter = twoPlayers()
    const playerId = encounter.players[0].id
    encounter = addSkillEntry(
      encounter,
      playerId,
      { timeSec: 10, label: 'A', skillId: 'skill-1' },
      'a',
    )
    encounter = addSkillEntry(encounter, playerId, { timeSec: 20, label: 'B' }, 'b')
    expect(encounter.players[0].entries[0].skillId).toBe('skill-1')

    const custom = updateSkillEntry(encounter, playerId, 'a', { timeSec: 40, label: 'A2' })
    expect(custom.players[0].entries).toEqual([
      { id: 'b', timeSec: 20, label: 'B' },
      { id: 'a', timeSec: 40, label: 'A2' },
    ])

    const picked = updateSkillEntry(custom, playerId, 'b', {
      timeSec: 20,
      label: 'S',
      skillId: 'skill-2',
    })
    expect(picked.players[0].entries[0]).toEqual({
      id: 'b',
      timeSec: 20,
      label: 'S',
      skillId: 'skill-2',
    })
  })

  it('removes an entry and keeps the result valid', () => {
    let encounter = twoPlayers()
    const playerId = encounter.players[0].id
    encounter = addSkillEntry(encounter, playerId, { timeSec: 10, label: 'A' }, 'a')
    encounter = addSkillEntry(encounter, playerId, { timeSec: 20, label: 'B' }, 'b')
    const updated = removeSkillEntry(encounter, playerId, 'a')
    expect(updated.players[0].entries.map((e) => e.id)).toEqual(['b'])
    expect(parseSaveData({ version: 1, encounters: [updated] }).ok).toBe(true)
  })

  it('leaves the encounter unchanged for an unknown player', () => {
    const encounter = twoPlayers()
    const updated = addSkillEntry(encounter, 'missing', { timeSec: 1, label: 'A' })
    expect(updated.players).toEqual(encounter.players)
  })
})

describe('setPlayerJob', () => {
  it('changes the job and turns unavailable skills into custom entries', () => {
    let encounter = emptyEncounter()
    const playerId = encounter.players[0].id
    encounter = addSkillEntry(encounter, playerId, { timeSec: 1, label: '鐵壁', skillId: 'keep' }, 'a')
    encounter = addSkillEntry(encounter, playerId, { timeSec: 2, label: '死鬥', skillId: 'drop' }, 'b')
    encounter = addSkillEntry(encounter, playerId, { timeSec: 3, label: '自訂' }, 'c')
    const isValid = (id: string) => id === 'keep'

    expect(countInvalidSkillEntries(encounter.players[0], isValid)).toBe(1)

    const updated = setPlayerJob(encounter, playerId, 'WAR', isValid)
    expect(updated.players[0].job).toBe('WAR')
    expect(updated.players[0].entries).toEqual([
      { id: 'a', timeSec: 1, label: '鐵壁', skillId: 'keep' },
      { id: 'b', timeSec: 2, label: '死鬥' },
      { id: 'c', timeSec: 3, label: '自訂' },
    ])
  })
})
