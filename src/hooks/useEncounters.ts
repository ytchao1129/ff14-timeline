import { useCallback, useEffect, useRef, useState } from 'react'
import { backupRawData, loadEncounters, saveEncounters } from '../lib/storage'
import type { LoadResult } from '../lib/storage'
import { mergeImported, parseImport } from '../lib/transfer'
import type { ParseResult } from '../lib/validate'
import type { Encounter } from '../types/timeline'

function loadInitial(): LoadResult {
  const result = loadEncounters()
  if (!result.ok && result.raw !== null) backupRawData(result.raw)
  return result
}

export function useEncounters() {
  const [initial] = useState(loadInitial)
  const [encounters, setEncounters] = useState<Encounter[]>(
    initial.ok ? initial.encounters : [],
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const lastSaved = useRef(encounters)

  useEffect(() => {
    if (encounters === lastSaved.current) return
    lastSaved.current = encounters
    const result = saveEncounters(encounters)
    setSaveError(result.ok ? null : result.error)
  }, [encounters])

  const addEncounter = useCallback((encounter: Encounter) => {
    setEncounters((prev) => [...prev, encounter])
  }, [])

  const updateEncounter = useCallback((id: string, recipe: (e: Encounter) => Encounter) => {
    setEncounters((prev) => prev.map((e) => (e.id === id ? recipe(e) : e)))
  }, [])

  const removeEncounter = useCallback((id: string) => {
    setEncounters((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const importFromText = useCallback((text: string): ParseResult<number> => {
    const result = parseImport(text)
    if (!result.ok) return result
    setEncounters((prev) => mergeImported(prev, result.value))
    return { ok: true, value: result.value.length }
  }, [])

  return {
    encounters,
    loadError: initial.ok ? null : initial.error,
    saveError,
    addEncounter,
    updateEncounter,
    removeEncounter,
    importFromText,
  }
}
