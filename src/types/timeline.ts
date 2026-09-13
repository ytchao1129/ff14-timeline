/** Current save/export data format version. Bump when the shape changes. */
export const SCHEMA_VERSION = 1

/** Seconds before the pull that the player timeline shows. */
export const PREPULL_SEC = 16

export const MAX_PLAYERS = 8

export const DAMAGE_TYPES = ['physical', 'magical', 'unique'] as const
export type DamageType = (typeof DAMAGE_TYPES)[number]

export const ACTION_TARGETS = ['raidwide', 'tank', 'single', 'other'] as const
export type ActionTarget = (typeof ACTION_TARGETS)[number]

export interface BossActionDetails {
  damageType?: DamageType
  target?: ActionTarget
  damage?: number
}

export interface BossAction {
  id: string
  name: string
  /** Instant actions use the same value for start and end. */
  castStartSec: number
  castEndSec: number
  note?: string
  details?: BossActionDetails
}

export interface SkillEntry {
  id: string
  /** May be negative down to -PREPULL_SEC. */
  timeSec: number
  /** Set when picked from a job skill table. */
  skillId?: string
  label: string
}

export interface PlayerPlan {
  id: string
  /** Job abbreviation such as "PLD"; empty for manual-only plans. */
  job: string
  entries: SkillEntry[]
}

export interface Encounter {
  id: string
  name: string
  durationSec: number
  bossActions: BossAction[]
  players: PlayerPlan[]
}

export const SKILL_CATEGORIES = ['mitigation', 'party', 'heal', 'buff', 'utility'] as const
export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

export interface SkillDef {
  id: string
  /** Job abbreviation, or "role-tank" / "role-healer" for shared role actions. */
  job: string
  name: string
  /** English name, kept to make checking the data against the game easier. */
  nameEn: string
  category: SkillCategory
  recastSec: number
  durationSec?: number
  charges?: number
}

export interface SaveData {
  version: number
  encounters: Encounter[]
}
