import type { ActionTarget, BossActionDetails, DamageType } from '../types/timeline'

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  physical: '物理',
  magical: '魔法',
  unique: '特殊',
}

export const TARGET_LABELS: Record<ActionTarget, string> = {
  raidwide: '全體',
  tank: '坦克',
  single: '單體',
  other: '其他',
}

export function formatDamage(damage: number): string {
  return damage.toLocaleString('en-US')
}

/** Short summary such as "魔法 · 全體 · 120,000"; empty when nothing is set. */
export function describeDetails(details: BossActionDetails): string {
  return [
    details.damageType && DAMAGE_TYPE_LABELS[details.damageType],
    details.target && TARGET_LABELS[details.target],
    details.damage !== undefined && formatDamage(details.damage),
  ]
    .filter(Boolean)
    .join(' · ')
}
