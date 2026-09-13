import { describe, expect, it } from 'vitest'
import { createSampleEncounter } from '../data/sample'
import { BACKUP_KEY, STORAGE_KEY, backupRawData, loadEncounters, saveEncounters } from './storage'
import type { StorageLike } from './storage'

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('quota exceeded')
  },
}

describe('storage', () => {
  it('returns an empty list when nothing is saved', () => {
    expect(loadEncounters(new MemoryStorage())).toEqual({ ok: true, encounters: [] })
  })

  it('loads what was saved', () => {
    const storage = new MemoryStorage()
    const encounters = [createSampleEncounter(), createSampleEncounter('第二個')]
    expect(saveEncounters(encounters, storage)).toEqual({ ok: true })
    expect(loadEncounters(storage)).toEqual({ ok: true, encounters })
  })

  it('reports corrupted JSON and keeps the raw text', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '{broken')
    const result = loadEncounters(storage)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.raw).toBe('{broken')
  })

  it('reports data with an invalid shape', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, encounters: 'nope' }))
    expect(loadEncounters(storage).ok).toBe(false)
  })

  it('reports failures instead of throwing when storage is unavailable', () => {
    expect(loadEncounters(brokenStorage)).toMatchObject({ ok: false, raw: null })
    expect(saveEncounters([], brokenStorage).ok).toBe(false)
    expect(backupRawData('x', brokenStorage)).toBe(false)
  })

  it('backs up raw data under a separate key', () => {
    const storage = new MemoryStorage()
    expect(backupRawData('{broken', storage)).toBe(true)
    expect(storage.getItem(BACKUP_KEY)).toBe('{broken')
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })
})
