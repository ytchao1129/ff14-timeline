export const ROLES = ['tank', 'healer'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  tank: '坦克',
  healer: '補師',
}

export interface JobDef {
  id: string
  name: string
  role: Role
}

export const JOBS: JobDef[] = [
  { id: 'PLD', name: '騎士', role: 'tank' },
  { id: 'WAR', name: '戰士', role: 'tank' },
  { id: 'DRK', name: '暗黑騎士', role: 'tank' },
  { id: 'GNB', name: '絕槍戰士', role: 'tank' },
  { id: 'WHM', name: '白魔道士', role: 'healer' },
  { id: 'SCH', name: '學者', role: 'healer' },
  { id: 'AST', name: '占星術士', role: 'healer' },
  { id: 'SGE', name: '賢者', role: 'healer' },
]

export function findJob(id: string): JobDef | undefined {
  return JOBS.find((job) => job.id === id)
}
