import { createId } from '../lib/id'
import type { Encounter } from '../types/timeline'

/** Placeholder data for development; names do not reflect real encounters. */
export function createSampleEncounter(name = '測試副本'): Encounter {
  return {
    id: createId(),
    name,
    durationSec: 600,
    bossActions: [
      {
        id: createId(),
        name: '開場全體攻擊',
        castStartSec: 8,
        castEndSec: 13,
        details: { damageType: 'magical', target: 'raidwide' },
      },
      {
        id: createId(),
        name: '坦克死刑',
        castStartSec: 25,
        castEndSec: 30,
        details: { damageType: 'physical', target: 'tank' },
      },
      { id: createId(), name: '瞬發招式', castStartSec: 42, castEndSec: 42, note: '無讀條' },
    ],
    players: [
      {
        id: createId(),
        job: '',
        entries: [
          { id: createId(), timeSec: -16, label: '開場準備' },
          { id: createId(), timeSec: 10, label: '團隊減傷' },
        ],
      },
    ],
  }
}
