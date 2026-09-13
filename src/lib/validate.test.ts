import { describe, expect, it } from 'vitest'
import { createSampleEncounter } from '../data/sample'
import { MAX_PLAYERS, SCHEMA_VERSION } from '../types/timeline'
import type { SaveData } from '../types/timeline'
import { parseSaveData } from './validate'

function validData(): SaveData {
  return { version: SCHEMA_VERSION, encounters: [createSampleEncounter()] }
}

function expectError(input: unknown, pathFragment: string) {
  const result = parseSaveData(input)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toContain(pathFragment)
}

describe('parseSaveData', () => {
  it('accepts valid data unchanged', () => {
    const data = validData()
    expect(parseSaveData(data)).toEqual({ ok: true, value: data })
  })

  it('accepts data after a JSON round trip', () => {
    const data = validData()
    expect(parseSaveData(JSON.parse(JSON.stringify(data)))).toEqual({ ok: true, value: data })
  })

  it('drops unknown fields', () => {
    const data = validData()
    const result = parseSaveData({
      ...data,
      extra: 1,
      encounters: [{ ...data.encounters[0], extra: 'x' }],
    })
    expect(result).toEqual({ ok: true, value: data })
  })

  it('rejects non-object input', () => {
    expectError(null, '必須是物件')
    expectError([], '必須是物件')
  })

  it('rejects a newer version', () => {
    expectError({ ...validData(), version: SCHEMA_VERSION + 1 }, 'version')
  })

  it('rejects a non-positive duration', () => {
    const data = validData()
    data.encounters[0].durationSec = 0
    expectError(data, 'encounters[0].durationSec')
  })

  it('rejects cast end earlier than cast start', () => {
    const data = validData()
    data.encounters[0].bossActions[0].castStartSec = 10
    data.encounters[0].bossActions[0].castEndSec = 5
    expectError(data, 'encounters[0].bossActions[0].castEndSec')
  })

  it('accepts an instant action', () => {
    const data = validData()
    data.encounters[0].bossActions[0].castStartSec = 10
    data.encounters[0].bossActions[0].castEndSec = 10
    expect(parseSaveData(data).ok).toBe(true)
  })

  it('allows skill entries down to -16 seconds only', () => {
    const data = validData()
    data.encounters[0].players[0].entries[0].timeSec = -16
    expect(parseSaveData(data).ok).toBe(true)

    data.encounters[0].players[0].entries[0].timeSec = -17
    expectError(data, 'encounters[0].players[0].entries[0].timeSec')
  })

  it('rejects more than the maximum number of players', () => {
    const data = validData()
    const template = data.encounters[0].players[0]
    data.encounters[0].players = Array.from({ length: MAX_PLAYERS + 1 }, (_, i) => ({
      ...template,
      id: `p${i}`,
    }))
    expectError(data, 'encounters[0].players')
  })

  it('rejects an invalid damage type', () => {
    const data = validData()
    const raw = JSON.parse(JSON.stringify(data))
    raw.encounters[0].bossActions[0].details.damageType = 'fire'
    expectError(raw, 'encounters[0].bossActions[0].details.damageType')
  })

  it('rejects duplicate encounter ids', () => {
    const data = validData()
    data.encounters.push({ ...createSampleEncounter(), id: data.encounters[0].id })
    expectError(data, 'encounters[1].id')
  })
})
