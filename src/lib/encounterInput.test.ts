import { describe, expect, it } from 'vitest'
import {
  validateBossActionInput,
  validateEncounterInput,
  validateSkillEntryInput,
} from './encounterInput'

describe('validateEncounterInput', () => {
  it('accepts a name and a m:ss duration', () => {
    expect(validateEncounterInput({ name: '  副本  ', duration: '10:00' })).toEqual({
      ok: true,
      value: { name: '副本', durationSec: 600 },
    })
  })

  it('reports every invalid field', () => {
    const result = validateEncounterInput({ name: ' ', duration: 'abc' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['duration', 'name'])
  })

  it('rejects zero duration and names that are too long', () => {
    const result = validateEncounterInput({ name: 'a'.repeat(51), duration: '0' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.name).toBeDefined()
      expect(result.errors.duration).toBe('必須大於 0')
    }
  })

  it('rejects a duration shorter than existing boss actions', () => {
    const result = validateEncounterInput({ name: '副本', duration: '1:00' }, 90)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.duration).toContain('1:30')
  })
})

describe('validateBossActionInput', () => {
  const base = { name: '全體攻擊', start: '0:10', end: '0:15', note: '' }

  it('accepts a cast and omits an empty note', () => {
    expect(validateBossActionInput(base, 600)).toEqual({
      ok: true,
      value: { name: '全體攻擊', castStartSec: 10, castEndSec: 15 },
    })
  })

  it('treats a blank end time as an instant action', () => {
    const result = validateBossActionInput({ ...base, end: ' ' }, 600)
    expect(result).toMatchObject({ ok: true, value: { castStartSec: 10, castEndSec: 10 } })
  })

  it('keeps a trimmed note', () => {
    const result = validateBossActionInput({ ...base, note: '  注意站位 ' }, 600)
    expect(result).toMatchObject({ ok: true, value: { note: '注意站位' } })
  })

  it('requires a start time', () => {
    const result = validateBossActionInput({ ...base, start: '' }, 600)
    expect(result).toEqual({ ok: false, errors: { start: '請輸入讀條開始時間' } })
  })

  it('rejects start times before the pull or after the encounter', () => {
    expect(validateBossActionInput({ ...base, start: '-5' }, 600)).toMatchObject({
      ok: false,
      errors: { start: '不得早於開打（0:00）' },
    })
    expect(validateBossActionInput({ ...base, start: '11:00', end: '' }, 600)).toMatchObject({
      ok: false,
      errors: { start: expect.stringContaining('10:00') },
    })
  })

  it('rejects an end earlier than the start', () => {
    const result = validateBossActionInput({ ...base, start: '20', end: '15' }, 600)
    expect(result).toEqual({ ok: false, errors: { end: '不得早於讀條開始' } })
  })

  it('rejects an end after the encounter', () => {
    const result = validateBossActionInput({ ...base, start: '9:58', end: '10:02' }, 600)
    expect(result).toMatchObject({ ok: false, errors: { end: expect.stringContaining('10:00') } })
  })

  it('rejects malformed times', () => {
    const result = validateBossActionInput({ ...base, start: '1:75', end: 'x' }, 600)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['end', 'start'])
  })
})

describe('validateSkillEntryInput', () => {
  it('accepts a trimmed label and a prepull time', () => {
    expect(validateSkillEntryInput({ time: '-0:10', label: ' 開場盾 ' }, 600)).toEqual({
      ok: true,
      value: { timeSec: -10, label: '開場盾' },
    })
  })

  it('accepts the earliest prepull time and the encounter end', () => {
    expect(validateSkillEntryInput({ time: '-16', label: 'A' }, 600).ok).toBe(true)
    expect(validateSkillEntryInput({ time: '10:00', label: 'A' }, 600).ok).toBe(true)
  })

  it('rejects times outside the timeline', () => {
    expect(validateSkillEntryInput({ time: '-17', label: 'A' }, 600)).toMatchObject({
      ok: false,
      errors: { time: expect.stringContaining('-0:16') },
    })
    expect(validateSkillEntryInput({ time: '10:01', label: 'A' }, 600)).toMatchObject({
      ok: false,
      errors: { time: expect.stringContaining('10:00') },
    })
  })

  it('requires both fields', () => {
    expect(validateSkillEntryInput({ time: '', label: ' ' }, 600)).toEqual({
      ok: false,
      errors: { time: '請輸入使用時間', label: '請輸入技能名稱' },
    })
  })

  it('rejects a malformed time', () => {
    const result = validateSkillEntryInput({ time: '1:99', label: 'A' }, 600)
    expect(result).toMatchObject({ ok: false, errors: { time: expect.stringContaining('格式錯誤') } })
  })
})
