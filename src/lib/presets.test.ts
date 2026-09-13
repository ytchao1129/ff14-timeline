import { describe, expect, it } from 'vitest'
import { createSampleEncounter } from '../data/sample'
import { loadPresets } from './presets'
import { serializeExport } from './transfer'

function exportJson(...names: string[]): unknown {
  return JSON.parse(serializeExport(names.map((name) => createSampleEncounter(name))))
}

describe('loadPresets', () => {
  it('lists every encounter from valid files in file name order', () => {
    const result = loadPresets({
      '/presets/b.json': exportJson('B1'),
      '/presets/a.json': exportJson('A1', 'A2'),
    })
    expect(result.errors).toEqual([])
    expect(result.encounters.map((p) => [p.key, p.fileName, p.encounter.name])).toEqual([
      ['a.json#0', 'a.json', 'A1'],
      ['a.json#1', 'a.json', 'A2'],
      ['b.json#0', 'b.json', 'B1'],
    ])
  })

  it('reports invalid files without dropping valid ones', () => {
    const result = loadPresets({
      '/presets/good.json': exportJson('Good'),
      '/presets/other-app.json': { app: 'other', version: 1, encounters: [] },
      '/presets/broken.json': { app: 'ff14-timeline', version: 1, encounters: [{}] },
    })
    expect(result.encounters.map((p) => p.encounter.name)).toEqual(['Good'])
    expect(result.errors.map((e) => e.fileName)).toEqual(['broken.json', 'other-app.json'])
    expect(result.errors[1].error).toBe('這不是排軸器匯出的檔案')
  })

  it('returns nothing when there are no preset files', () => {
    expect(loadPresets({})).toEqual({ encounters: [], errors: [] })
  })
})
