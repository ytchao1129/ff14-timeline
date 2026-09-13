import { describe, expect, it } from 'vitest'
import { createSampleEncounter } from '../data/sample'
import { exportFileName, mergeImported, parseImport, serializeExport } from './transfer'

describe('serializeExport / parseImport', () => {
  it('imports exactly what was exported', () => {
    const encounters = [createSampleEncounter(), createSampleEncounter('第二個')]
    expect(parseImport(serializeExport(encounters))).toEqual({ ok: true, value: encounters })
  })

  it('rejects text that is not JSON', () => {
    expect(parseImport('not json')).toMatchObject({ ok: false })
  })

  it('rejects files from other apps', () => {
    const text = JSON.stringify({ app: 'other', version: 1, encounters: [] })
    expect(parseImport(text)).toEqual({ ok: false, error: '這不是排軸器匯出的檔案' })
  })

  it('rejects files with invalid content', () => {
    const text = JSON.stringify({ app: 'ff14-timeline', version: 1, encounters: [{}] })
    expect(parseImport(text).ok).toBe(false)
  })
})

describe('mergeImported', () => {
  it('appends imported encounters after existing ones', () => {
    const a = createSampleEncounter('A')
    const b = createSampleEncounter('B')
    expect(mergeImported([a], [b])).toEqual([a, b])
  })

  it('assigns a new id when an imported id already exists', () => {
    const existing = createSampleEncounter('A')
    const duplicate = { ...createSampleEncounter('B'), id: existing.id }
    const merged = mergeImported([existing], [duplicate], () => 'new-id')
    expect(merged.map((e) => e.id)).toEqual([existing.id, 'new-id'])
    expect(merged[1].name).toBe('B')
    expect(duplicate.id).toBe(existing.id)
  })
})

describe('exportFileName', () => {
  it('uses local date and time', () => {
    expect(exportFileName(new Date(2026, 8, 3, 7, 5))).toBe('ff14-timeline-20260903-0705.json')
  })
})
