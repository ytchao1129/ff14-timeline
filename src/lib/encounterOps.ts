import { MAX_PLAYERS } from '../types/timeline'
import type { BossAction, Encounter, PlayerPlan, SkillEntry } from '../types/timeline'
import type { BossActionValues, EncounterValues, SkillEntryValues } from './encounterInput'
import { createId } from './id'

function createPlayerPlan(): PlayerPlan {
  return { id: createId(), job: '', entries: [] }
}

export function createEncounter(values: EncounterValues): Encounter {
  return {
    id: createId(),
    name: values.name,
    durationSec: values.durationSec,
    bossActions: [],
    players: [createPlayerPlan()],
  }
}

export function updateEncounterInfo(encounter: Encounter, values: EncounterValues): Encounter {
  return { ...encounter, name: values.name, durationSec: values.durationSec }
}

/** Latest time used by a boss action or skill entry; the duration may not be shorter. */
export function latestUsedSec(encounter: Encounter): number {
  return Math.max(
    0,
    ...encounter.bossActions.map((a) => a.castEndSec),
    ...encounter.players.flatMap((p) => p.entries.map((e) => e.timeSec)),
  )
}

function sortByStart(actions: BossAction[]): BossAction[] {
  return [...actions].sort(
    (a, b) => a.castStartSec - b.castStartSec || a.castEndSec - b.castEndSec,
  )
}

/** Applies form values; optional fields left empty in the form are removed. */
function applyValues(action: BossAction, values: BossActionValues): BossAction {
  const { note: _oldNote, details: _oldDetails, ...rest } = action
  const next: BossAction = {
    ...rest,
    name: values.name,
    castStartSec: values.castStartSec,
    castEndSec: values.castEndSec,
  }
  if (values.note !== undefined) next.note = values.note
  if (values.details !== undefined) next.details = values.details
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

export function addPlayer(encounter: Encounter): Encounter {
  if (encounter.players.length >= MAX_PLAYERS) return encounter
  return { ...encounter, players: [...encounter.players, createPlayerPlan()] }
}

export function removePlayer(encounter: Encounter, playerId: string): Encounter {
  return { ...encounter, players: encounter.players.filter((p) => p.id !== playerId) }
}

function sortByTime(entries: SkillEntry[]): SkillEntry[] {
  return [...entries].sort((a, b) => a.timeSec - b.timeSec)
}

function toSkillEntry(id: string, values: SkillEntryValues): SkillEntry {
  const entry: SkillEntry = { id, timeSec: values.timeSec, label: values.label }
  if (values.skillId) entry.skillId = values.skillId
  return entry
}

function updatePlayer(
  encounter: Encounter,
  playerId: string,
  recipe: (player: PlayerPlan) => PlayerPlan,
): Encounter {
  return {
    ...encounter,
    players: encounter.players.map((p) => (p.id === playerId ? recipe(p) : p)),
  }
}

export function addSkillEntry(
  encounter: Encounter,
  playerId: string,
  values: SkillEntryValues,
  id = createId(),
): Encounter {
  const entry = toSkillEntry(id, values)
  return updatePlayer(encounter, playerId, (p) => ({
    ...p,
    entries: sortByTime([...p.entries, entry]),
  }))
}

export function updateSkillEntry(
  encounter: Encounter,
  playerId: string,
  id: string,
  values: SkillEntryValues,
): Encounter {
  return updatePlayer(encounter, playerId, (p) => ({
    ...p,
    entries: sortByTime(p.entries.map((e) => (e.id === id ? toSkillEntry(e.id, values) : e))),
  }))
}

export function removeSkillEntry(encounter: Encounter, playerId: string, id: string): Encounter {
  return updatePlayer(encounter, playerId, (p) => ({
    ...p,
    entries: p.entries.filter((e) => e.id !== id),
  }))
}

type SkillValidator = (skillId: string) => boolean

export function countInvalidSkillEntries(player: PlayerPlan, isValidSkill: SkillValidator): number {
  return player.entries.filter((e) => e.skillId && !isValidSkill(e.skillId)).length
}

/** Changes the job; entries whose skill is unavailable keep their name as custom entries. */
export function setPlayerJob(
  encounter: Encounter,
  playerId: string,
  job: string,
  isValidSkill: SkillValidator,
): Encounter {
  return updatePlayer(encounter, playerId, (p) => ({
    ...p,
    job,
    entries: p.entries.map((e) =>
      e.skillId && !isValidSkill(e.skillId)
        ? toSkillEntry(e.id, { timeSec: e.timeSec, label: e.label })
        : e,
    ),
  }))
}
