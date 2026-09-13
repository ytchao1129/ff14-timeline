import type { SkillDef, SkillEntry } from '../types/timeline'
import { formatTime } from './timeScale'

// Tolerates floating point noise so a use exactly at the ready time is allowed.
const EPSILON = 1e-6

export interface CooldownWindow {
  /** The use that spent the last available charge. */
  entryId: string
  startSec: number
  /** When the next charge becomes available. */
  endSec: number
}

export interface SkillUsageAnalysis {
  /** Periods when every charge of a skill is on cooldown. */
  cooldowns: CooldownWindow[]
  /** Entries used while no charge was available, mapped to the time a charge is ready. */
  conflicts: Map<string, number>
}

/**
 * Replays skill uses in time order. Charges recover one at a time, and a use
 * made while no charge is available is reported as a conflict without spending one.
 */
export function analyzeSkillUsage(entries: SkillEntry[], skills: SkillDef[]): SkillUsageAnalysis {
  const skillById = new Map(skills.map((s) => [s.id, s]))
  const usesBySkill = new Map<SkillDef, SkillEntry[]>()
  for (const entry of [...entries].sort((a, b) => a.timeSec - b.timeSec)) {
    const skill = entry.skillId ? skillById.get(entry.skillId) : undefined
    if (!skill) continue
    const uses = usesBySkill.get(skill)
    if (uses) uses.push(entry)
    else usesBySkill.set(skill, [entry])
  }

  const cooldowns: CooldownWindow[] = []
  const conflicts = new Map<string, number>()

  for (const [skill, uses] of usesBySkill) {
    const maxCharges = skill.charges ?? 1
    let available = maxCharges
    // Start time of the recharge in progress; null while all charges are full.
    let rechargeStart: number | null = null

    for (const entry of uses) {
      const t = entry.timeSec
      while (rechargeStart !== null && t + EPSILON >= rechargeStart + skill.recastSec) {
        available++
        rechargeStart = available < maxCharges ? rechargeStart + skill.recastSec : null
      }

      if (available === 0) {
        conflicts.set(entry.id, (rechargeStart ?? t) + skill.recastSec)
        continue
      }

      available--
      if (rechargeStart === null) rechargeStart = t
      if (available === 0) {
        cooldowns.push({ entryId: entry.id, startSec: t, endSec: rechargeStart + skill.recastSec })
      }
    }
  }

  return { cooldowns, conflicts }
}

export function describeConflict(timeSec: number, readyAtSec: number): string {
  const waitSec = Math.round((readyAtSec - timeSec) * 10) / 10
  return `冷卻中，還差 ${waitSec} 秒（${formatTime(readyAtSec)} 可用）`
}
