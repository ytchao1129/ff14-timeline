import type { SkillCategory, SkillDef } from '../../types/timeline'

interface SkillOptions {
  durationSec?: number
  charges?: number
}

type SkillRow = [
  name: string,
  nameEn: string,
  category: SkillCategory,
  recastSec: number,
  options?: SkillOptions,
]

/** Builds skill definitions with ids derived from the owner and the English name. */
export function defineSkills(owner: string, rows: SkillRow[]): SkillDef[] {
  return rows.map(([name, nameEn, category, recastSec, options]) => ({
    id: `${owner.toLowerCase()}-${nameEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`,
    job: owner,
    name,
    nameEn,
    category,
    recastSec,
    ...options,
  }))
}
