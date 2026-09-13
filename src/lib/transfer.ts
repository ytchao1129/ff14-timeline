import { SCHEMA_VERSION } from '../types/timeline'
import type { Encounter, SaveData } from '../types/timeline'
import { createId } from './id'
import { isRecord, parseSaveData } from './validate'
import type { ParseResult } from './validate'

export const APP_ID = 'ff14-timeline'

export interface ExportFile extends SaveData {
  app: typeof APP_ID
  exportedAt: string
}

export function serializeExport(encounters: Encounter[], now = new Date()): string {
  const file: ExportFile = {
    app: APP_ID,
    version: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    encounters,
  }
  return JSON.stringify(file, null, 2)
}

export function parseImport(text: string): ParseResult<Encounter[]> {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: '檔案不是有效的 JSON' }
  }
  return parseExportData(json)
}

/** Validates already-parsed export data, such as a bundled preset file. */
export function parseExportData(json: unknown): ParseResult<Encounter[]> {
  if (isRecord(json) && json.app !== APP_ID) {
    return { ok: false, error: '這不是排軸器匯出的檔案' }
  }
  const result = parseSaveData(json)
  return result.ok ? { ok: true, value: result.value.encounters } : result
}

/** Appends imported encounters, giving a new id to any that collide. */
export function mergeImported(
  existing: Encounter[],
  imported: Encounter[],
  newId: () => string = createId,
): Encounter[] {
  const used = new Set(existing.map((e) => e.id))
  const added = imported.map((encounter) => {
    let id = encounter.id
    while (used.has(id)) id = newId()
    used.add(id)
    return id === encounter.id ? encounter : { ...encounter, id }
  })
  return [...existing, ...added]
}

export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `ff14-timeline-${date}-${time}.json`
}

export function downloadTextFile(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
