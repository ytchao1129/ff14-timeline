import { SCHEMA_VERSION } from '../types/timeline'
import type { Encounter, SaveData } from '../types/timeline'
import { parseSaveData } from './validate'

export const STORAGE_KEY = 'ff14-timeline'
export const BACKUP_KEY = 'ff14-timeline:corrupted-backup'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export type LoadResult =
  | { ok: true; encounters: Encounter[] }
  | { ok: false; error: string; raw: string | null }

export type SaveResult = { ok: true } | { ok: false; error: string }

// Accessing window.localStorage itself can throw (e.g. blocked site data),
// so it is resolved inside each try block.
function resolveStorage(storage?: StorageLike): StorageLike {
  return storage ?? window.localStorage
}

export function loadEncounters(storage?: StorageLike): LoadResult {
  let raw: string | null
  try {
    raw = resolveStorage(storage).getItem(STORAGE_KEY)
  } catch {
    return { ok: false, error: '無法讀取瀏覽器儲存空間，可能已被瀏覽器設定停用', raw: null }
  }
  if (raw === null) return { ok: true, encounters: [] }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, error: '存檔內容損壞（不是有效的 JSON）', raw }
  }

  const result = parseSaveData(json)
  return result.ok
    ? { ok: true, encounters: result.value.encounters }
    : { ok: false, error: `存檔內容格式錯誤：${result.error}`, raw }
}

export function saveEncounters(encounters: Encounter[], storage?: StorageLike): SaveResult {
  const data: SaveData = { version: SCHEMA_VERSION, encounters }
  try {
    resolveStorage(storage).setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch {
    return { ok: false, error: '儲存失敗，瀏覽器儲存空間可能已滿或已被停用' }
  }
}

/** Keeps unreadable save data so it is not lost when new data is saved. */
export function backupRawData(raw: string, storage?: StorageLike): boolean {
  try {
    resolveStorage(storage).setItem(BACKUP_KEY, raw)
    return true
  } catch {
    return false
  }
}
