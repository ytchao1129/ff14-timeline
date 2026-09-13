import {
  ACTION_TARGETS,
  DAMAGE_TYPES,
  MAX_PLAYERS,
  PREPULL_SEC,
  SCHEMA_VERSION,
} from '../types/timeline'
import type {
  BossAction,
  BossActionDetails,
  Encounter,
  PlayerPlan,
  SaveData,
  SkillEntry,
} from '../types/timeline'

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

class ValidationError extends Error {}

function fail(path: string, message: string): never {
  throw new ValidationError(path ? `${path}：${message}` : message)
}

function at(path: string, key: string): string {
  return path ? `${path}.${key}` : key
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(path, '必須是物件')
  return value
}

function readString(obj: Record<string, unknown>, key: string, path: string): string {
  const value = obj[key]
  if (typeof value !== 'string') fail(at(path, key), '必須是文字')
  return value
}

function readOptionalString(
  obj: Record<string, unknown>,
  key: string,
  path: string,
): string | undefined {
  return obj[key] === undefined ? undefined : readString(obj, key, path)
}

function readNumber(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  min?: number,
): number {
  const value = obj[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(at(path, key), '必須是數字')
  }
  if (min !== undefined && value < min) fail(at(path, key), `不得小於 ${min}`)
  return value
}

function readOptionalNumber(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  min?: number,
): number | undefined {
  return obj[key] === undefined ? undefined : readNumber(obj, key, path, min)
}

function readArray(obj: Record<string, unknown>, key: string, path: string): unknown[] {
  const value = obj[key]
  if (!Array.isArray(value)) fail(at(path, key), '必須是陣列')
  return value
}

function readOptionalEnum<T extends string>(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  allowed: readonly T[],
): T | undefined {
  const value = obj[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    fail(at(path, key), `必須是 ${allowed.join(' / ')} 其中之一`)
  }
  return value as T
}

function assertUniqueIds(items: { id: string }[], path: string): void {
  const seen = new Set<string>()
  items.forEach((item, i) => {
    if (seen.has(item.id)) fail(`${path}[${i}].id`, `id 重複（${item.id}）`)
    seen.add(item.id)
  })
}

function parseDetails(value: unknown, path: string): BossActionDetails {
  const obj = readRecord(value, path)
  const details: BossActionDetails = {}
  const damageType = readOptionalEnum(obj, 'damageType', path, DAMAGE_TYPES)
  const target = readOptionalEnum(obj, 'target', path, ACTION_TARGETS)
  const damage = readOptionalNumber(obj, 'damage', path, 0)
  if (damageType !== undefined) details.damageType = damageType
  if (target !== undefined) details.target = target
  if (damage !== undefined) details.damage = damage
  return details
}

function parseBossAction(value: unknown, path: string): BossAction {
  const obj = readRecord(value, path)
  const castStartSec = readNumber(obj, 'castStartSec', path, 0)
  const castEndSec = readNumber(obj, 'castEndSec', path, 0)
  if (castEndSec < castStartSec) fail(at(path, 'castEndSec'), '讀條結束不得早於讀條開始')

  const action: BossAction = {
    id: readString(obj, 'id', path),
    name: readString(obj, 'name', path),
    castStartSec,
    castEndSec,
  }
  const note = readOptionalString(obj, 'note', path)
  if (note !== undefined) action.note = note
  if (obj.details !== undefined) action.details = parseDetails(obj.details, at(path, 'details'))
  return action
}

function parseSkillEntry(value: unknown, path: string): SkillEntry {
  const obj = readRecord(value, path)
  const entry: SkillEntry = {
    id: readString(obj, 'id', path),
    timeSec: readNumber(obj, 'timeSec', path, -PREPULL_SEC),
    label: readString(obj, 'label', path),
  }
  const skillId = readOptionalString(obj, 'skillId', path)
  if (skillId !== undefined) entry.skillId = skillId
  return entry
}

function parsePlayerPlan(value: unknown, path: string): PlayerPlan {
  const obj = readRecord(value, path)
  const entriesPath = at(path, 'entries')
  const entries = readArray(obj, 'entries', path).map((e, i) =>
    parseSkillEntry(e, `${entriesPath}[${i}]`),
  )
  assertUniqueIds(entries, entriesPath)
  return {
    id: readString(obj, 'id', path),
    job: readString(obj, 'job', path),
    entries,
  }
}

function parseEncounter(value: unknown, path: string): Encounter {
  const obj = readRecord(value, path)
  const durationSec = readNumber(obj, 'durationSec', path)
  if (durationSec <= 0) fail(at(path, 'durationSec'), '必須大於 0')

  const actionsPath = at(path, 'bossActions')
  const bossActions = readArray(obj, 'bossActions', path).map((a, i) =>
    parseBossAction(a, `${actionsPath}[${i}]`),
  )
  assertUniqueIds(bossActions, actionsPath)

  const playersPath = at(path, 'players')
  const rawPlayers = readArray(obj, 'players', path)
  if (rawPlayers.length > MAX_PLAYERS) fail(playersPath, `最多 ${MAX_PLAYERS} 位玩家`)
  const players = rawPlayers.map((p, i) => parsePlayerPlan(p, `${playersPath}[${i}]`))
  assertUniqueIds(players, playersPath)

  return {
    id: readString(obj, 'id', path),
    name: readString(obj, 'name', path),
    durationSec,
    bossActions,
    players,
  }
}

/**
 * Validates untrusted data (localStorage or an imported file) and returns a
 * clean copy that only contains known fields.
 */
export function parseSaveData(input: unknown): ParseResult<SaveData> {
  try {
    const obj = readRecord(input, '檔案內容')
    const version = readNumber(obj, 'version', '')
    if (!Number.isInteger(version) || version < 1) fail('version', '版本號無效')
    if (version > SCHEMA_VERSION) {
      fail('version', `資料來自較新版本（${version}），目前只支援到 ${SCHEMA_VERSION}`)
    }
    const encounters = readArray(obj, 'encounters', '').map((e, i) =>
      parseEncounter(e, `encounters[${i}]`),
    )
    assertUniqueIds(encounters, 'encounters')
    return { ok: true, value: { version: SCHEMA_VERSION, encounters } }
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message }
    throw error
  }
}
