import { PREPULL_SEC } from '../types/timeline'
import { parseTimeInput } from './timeInput'
import { formatTime } from './timeScale'

export const MAX_NAME_LENGTH = 50
export const MAX_NOTE_LENGTH = 200

const TIME_FORMAT_ERROR = '格式錯誤，請輸入秒數或「分:秒」，例如 75 或 1:15'

export type FieldErrors<F extends string> = Partial<Record<F, string>>

export type FormResult<V, F extends string> =
  | { ok: true; value: V }
  | { ok: false; errors: FieldErrors<F> }

function readName(text: string, emptyMessage: string, errors: FieldErrors<'name'>): string {
  const name = text.trim()
  if (!name) errors.name = emptyMessage
  else if (name.length > MAX_NAME_LENGTH) errors.name = `不得超過 ${MAX_NAME_LENGTH} 字`
  return name
}

export interface EncounterInput {
  name: string
  duration: string
}

export interface EncounterValues {
  name: string
  durationSec: number
}

/** `minDurationSec` keeps existing boss actions and skill entries inside the encounter. */
export function validateEncounterInput(
  input: EncounterInput,
  minDurationSec = 0,
): FormResult<EncounterValues, keyof EncounterInput> {
  const errors: FieldErrors<keyof EncounterInput> = {}
  const name = readName(input.name, '請輸入副本名稱', errors)

  const durationSec = parseTimeInput(input.duration)
  if (durationSec === null) {
    errors.duration = TIME_FORMAT_ERROR
  } else if (durationSec <= 0) {
    errors.duration = '必須大於 0'
  } else if (durationSec < minDurationSec) {
    errors.duration = `不得短於已排入的最後一個招式或技能（${formatTime(minDurationSec)}）`
  }

  if (durationSec === null || Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { name, durationSec } }
}

export interface BossActionInput {
  name: string
  start: string
  /** Blank means an instant action. */
  end: string
  note: string
}

export interface BossActionValues {
  name: string
  castStartSec: number
  castEndSec: number
  note?: string
}

export function validateBossActionInput(
  input: BossActionInput,
  durationSec: number,
): FormResult<BossActionValues, keyof BossActionInput> {
  const errors: FieldErrors<keyof BossActionInput> = {}
  const name = readName(input.name, '請輸入招式名稱', errors)
  const limit = `副本結束（${formatTime(durationSec)}）`

  const castStartSec = parseTimeInput(input.start)
  if (castStartSec === null) {
    errors.start = input.start.trim() ? TIME_FORMAT_ERROR : '請輸入讀條開始時間'
  } else if (castStartSec < 0) {
    errors.start = '不得早於開打（0:00）'
  } else if (castStartSec > durationSec) {
    errors.start = `不得晚於${limit}`
  }

  let castEndSec = castStartSec
  if (input.end.trim()) {
    castEndSec = parseTimeInput(input.end)
    if (castEndSec === null) {
      errors.end = TIME_FORMAT_ERROR
    } else if (castStartSec !== null && castEndSec < castStartSec) {
      errors.end = '不得早於讀條開始'
    } else if (castEndSec > durationSec) {
      errors.end = `不得晚於${limit}`
    }
  }

  const note = input.note.trim()
  if (note.length > MAX_NOTE_LENGTH) errors.note = `不得超過 ${MAX_NOTE_LENGTH} 字`

  if (castStartSec === null || castEndSec === null || Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  const value: BossActionValues = { name, castStartSec, castEndSec }
  if (note) value.note = note
  return { ok: true, value }
}

export interface SkillEntryInput {
  time: string
  label: string
}

export interface SkillEntryValues {
  timeSec: number
  label: string
}

export function validateSkillEntryInput(
  input: SkillEntryInput,
  durationSec: number,
): FormResult<SkillEntryValues, keyof SkillEntryInput> {
  const errors: FieldErrors<keyof SkillEntryInput> = {}

  const timeSec = parseTimeInput(input.time)
  if (timeSec === null) {
    errors.time = input.time.trim() ? TIME_FORMAT_ERROR : '請輸入使用時間'
  } else if (timeSec < -PREPULL_SEC) {
    errors.time = `不得早於開打前 ${PREPULL_SEC} 秒（${formatTime(-PREPULL_SEC)}）`
  } else if (timeSec > durationSec) {
    errors.time = `不得晚於副本結束（${formatTime(durationSec)}）`
  }

  const label = input.label.trim()
  if (!label) errors.label = '請輸入技能名稱'
  else if (label.length > MAX_NAME_LENGTH) errors.label = `不得超過 ${MAX_NAME_LENGTH} 字`

  if (timeSec === null || Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { timeSec, label } }
}
