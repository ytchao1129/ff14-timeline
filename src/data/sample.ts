import { createId } from '../lib/id'
import type { BossAction, Encounter, SkillEntry } from '../types/timeline'

function cast(name: string, start: number, end: number, extra?: Partial<BossAction>): BossAction {
  return { id: createId(), name, castStartSec: start, castEndSec: end, ...extra }
}

function skill(timeSec: number, label: string): SkillEntry {
  return { id: createId(), timeSec, label }
}

/** Placeholder data for development; names do not reflect real encounters. */
export function createSampleEncounter(name = '測試副本'): Encounter {
  return {
    id: createId(),
    name,
    durationSec: 600,
    bossActions: [
      cast('開場全體攻擊', 8, 13, { details: { damageType: 'magical', target: 'raidwide' } }),
      cast('坦克死刑', 25, 30, { details: { damageType: 'physical', target: 'tank' } }),
      cast('瞬發招式', 42, 42, { note: '無讀條' }),
      cast('場地機制', 55, 63),
      cast('重疊讀條', 58, 61),
      cast('連續攻擊', 80, 84),
      cast('分攤', 96, 101),
      cast('全體攻擊', 130, 135),
      cast('擊退', 170, 170),
      cast('坦克死刑', 185, 190),
      cast('狂暴', 590, 600),
    ],
    players: [
      {
        id: createId(),
        job: '',
        entries: [
          skill(-16, '開場準備'),
          skill(-3, '開場技能'),
          skill(10, '團隊減傷'),
          skill(11, '個人減傷'),
          skill(27, '坦克減傷'),
          skill(130, '團隊減傷'),
        ],
      },
      {
        id: createId(),
        job: '',
        entries: [skill(-5, '開場盾'), skill(95, '分攤減傷'), skill(186, '坦克減傷')],
      },
    ],
  }
}
