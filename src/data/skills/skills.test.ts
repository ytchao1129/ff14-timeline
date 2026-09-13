import { describe, expect, it } from 'vitest'
import { SKILL_CATEGORIES } from '../../types/timeline'
import type { SkillDef } from '../../types/timeline'
import { JOBS } from '../jobs'
import { describeRecast, getSkillsForJob, groupSkillsByCategory } from './index'

describe('job skill data', () => {
  it.each(JOBS.map((job) => [job.id, job.role] as const))(
    '%s has job skills, role actions, and valid numbers',
    (jobId, role) => {
      const skills = getSkillsForJob(jobId)
      expect(skills.some((s) => s.job === jobId)).toBe(true)
      expect(skills.some((s) => s.job === `role-${role}`)).toBe(true)

      for (const skill of skills) {
        expect(skill.name.trim()).not.toBe('')
        expect(skill.nameEn.trim()).not.toBe('')
        expect(SKILL_CATEGORIES).toContain(skill.category)
        expect(skill.recastSec).toBeGreaterThan(0)
        if (skill.durationSec !== undefined) expect(skill.durationSec).toBeGreaterThan(0)
        if (skill.charges !== undefined) {
          expect(Number.isInteger(skill.charges)).toBe(true)
          expect(skill.charges).toBeGreaterThanOrEqual(2)
        }
      }
    },
  )

  it('never reuses an id for two different skills', () => {
    const byId = new Map<string, SkillDef>()
    for (const job of JOBS) {
      for (const skill of getSkillsForJob(job.id)) {
        const existing = byId.get(skill.id)
        if (existing) expect(existing).toBe(skill)
        byId.set(skill.id, skill)
      }
    }
    expect(byId.size).toBeGreaterThan(0)
  })

  it('returns no skills for an empty or unknown job', () => {
    expect(getSkillsForJob('')).toEqual([])
    expect(getSkillsForJob('XYZ')).toEqual([])
  })
})

describe('groupSkillsByCategory', () => {
  it('keeps category order and drops empty groups', () => {
    const skill = (id: string, category: SkillDef['category']): SkillDef => ({
      id,
      job: 'PLD',
      name: id,
      nameEn: id,
      category,
      recastSec: 60,
    })
    const groups = groupSkillsByCategory([skill('b', 'buff'), skill('m', 'mitigation')])
    expect(groups.map((g) => [g.category, g.skills.map((s) => s.id)])).toEqual([
      ['mitigation', ['m']],
      ['buff', ['b']],
    ])
  })
})

describe('describeRecast', () => {
  it('shows charges only when there is more than one', () => {
    const base: SkillDef = {
      id: 'x',
      job: 'PLD',
      name: 'x',
      nameEn: 'x',
      category: 'utility',
      recastSec: 60,
    }
    expect(describeRecast(base)).toBe('CD 60 秒')
    expect(describeRecast({ ...base, charges: 2 })).toBe('CD 60 秒 ×2')
  })
})
