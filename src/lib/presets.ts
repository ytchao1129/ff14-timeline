import type { Encounter } from '../types/timeline'
import { parseExportData } from './transfer'

export interface PresetEncounter {
  /** Unique within the loaded presets, e.g. "boss.json#0". */
  key: string
  fileName: string
  encounter: Encounter
}

export interface PresetLoadResult {
  encounters: PresetEncounter[]
  errors: { fileName: string; error: string }[]
}

/** Validates preset files (path → parsed JSON) and lists their encounters in file name order. */
export function loadPresets(files: Record<string, unknown>): PresetLoadResult {
  const encounters: PresetEncounter[] = []
  const errors: PresetLoadResult['errors'] = []

  for (const path of Object.keys(files).sort()) {
    const fileName = path.split('/').pop() ?? path
    const result = parseExportData(files[path])
    if (!result.ok) {
      errors.push({ fileName, error: result.error })
      continue
    }
    result.value.forEach((encounter, index) => {
      encounters.push({ key: `${fileName}#${index}`, fileName, encounter })
    })
  }

  return { encounters, errors }
}
