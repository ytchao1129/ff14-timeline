import type { BossAction, Encounter } from '../types/timeline'
import type { BossActionValues, EncounterValues } from './encounterInput'
import { createId } from './id'

export function createEncounter(values: EncounterValues): Encounter {
  return {
    id: createId(),
    name: values.name,
    durationSec: values.durationSec,
    bossActions: [],
    players: [{ id: createId(), job: '', entries: [] }],
  }
}

export function updateEncounterInfo(encounter: Encounter, values: EncounterValues): Encounter {
  return { ...encounter, name: values.name, durationSec: values.durationSec }
}

export function lastBossActionEndSec(encounter: Encounter): number {
  return Math.max(0, ...encounter.bossActions.map((a) => a.castEndSec))
}

function sortByStart(actions: BossAction[]): BossAction[] {
  return [...actions].sort(
    (a, b) => a.castStartSec - b.castStartSec || a.castEndSec - b.castEndSec,
  )
}

/** Applies form values while keeping fields the form does not edit (such as details). */
function applyValues(action: BossAction, values: BossActionValues): BossAction {
  const { note: _oldNote, ...rest } = action
  const next: BossAction = {
    ...rest,
    name: values.name,
    castStartSec: values.castStartSec,
    castEndSec: values.castEndSec,
  }
  if (values.note !== undefined) next.note = values.note
  return next
}

export function addBossAction(
  encounter: Encounter,
  values: BossActionValues,
  id = createId(),
): Encounter {
  const action = applyValues({ id, name: '', castStartSec: 0, castEndSec: 0 }, values)
  return { ...encounter, bossActions: sortByStart([...encounter.bossActions, action]) }
}

export function updateBossAction(
  encounter: Encounter,
  id: string,
  values: BossActionValues,
): Encounter {
  return {
    ...encounter,
    bossActions: sortByStart(
      encounter.bossActions.map((a) => (a.id === id ? applyValues(a, values) : a)),
    ),
  }
}

export function removeBossAction(encounter: Encounter, id: string): Encounter {
  return { ...encounter, bossActions: encounter.bossActions.filter((a) => a.id !== id) }
}

export function formatCastLength(startSec: number, endSec: number): string {
  const length = Math.round((endSec - startSec) * 10) / 10
  return length === 0 ? '瞬發' : `${length} 秒`
}
