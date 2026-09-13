import { SKILL_CATEGORIES } from '../../types/timeline'
import type { SkillCategory, SkillDef } from '../../types/timeline'
import { findJob } from '../jobs'
import type { Role } from '../jobs'
import { HEALER_SKILLS } from './healers'
import { HEALER_ROLE_SKILLS, TANK_ROLE_SKILLS } from './roleActions'
import { TANK_SKILLS } from './tanks'

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  mitigation: '單體減傷',
  party: '團隊減傷',
  heal: '治療',
  buff: '增益',
  utility: '其他',
}

const JOB_SKILLS: Record<string, SkillDef[]> = { ...TANK_SKILLS, ...HEALER_SKILLS }

const ROLE_SKILLS: Record<Role, SkillDef[]> = {
  tank: TANK_ROLE_SKILLS,
  healer: HEALER_ROLE_SKILLS,
}

/** Job skills followed by the shared role actions; empty for unknown jobs. */
export function getSkillsForJob(jobId: string): SkillDef[] {
  const job = findJob(jobId)
  return job ? [...(JOB_SKILLS[job.id] ?? []), ...ROLE_SKILLS[job.role]] : []
}

export interface SkillGroup {
  category: SkillCategory
  label: string
  skills: SkillDef[]
}

export function groupSkillsByCategory(skills: SkillDef[]): SkillGroup[] {
  return SKILL_CATEGORIES.map((category) => ({
    category,
    label: SKILL_CATEGORY_LABELS[category],
    skills: skills.filter((s) => s.category === category),
  })).filter((group) => group.skills.length > 0)
}

export function describeRecast(skill: SkillDef): string {
  const charges = skill.charges && skill.charges > 1 ? ` ×${skill.charges}` : ''
  return `CD ${skill.recastSec} 秒${charges}`
}
