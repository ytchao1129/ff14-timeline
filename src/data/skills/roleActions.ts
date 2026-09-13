// DRAFT: based on patch 7.x at level 100. Names and numbers are unverified;
// check them against the game before relying on them.
import { defineSkills } from './define'

export const TANK_ROLE_SKILLS = defineSkills('role-tank', [
  ['鐵壁', 'Rampart', 'mitigation', 90, { durationSec: 20 }],
  ['雪仇', 'Reprisal', 'party', 60, { durationSec: 15 }],
  ['親疏自行', "Arm's Length", 'utility', 120, { durationSec: 6 }],
  ['挑釁', 'Provoke', 'utility', 30],
  ['退避', 'Shirk', 'utility', 120],
  ['下踢', 'Low Blow', 'utility', 25],
  ['插言', 'Interject', 'utility', 30],
])

export const HEALER_ROLE_SKILLS = defineSkills('role-healer', [
  ['即刻詠唱', 'Swiftcast', 'utility', 40],
  ['醒夢', 'Lucid Dreaming', 'utility', 60, { durationSec: 21 }],
  ['沉穩詠唱', 'Surecast', 'utility', 120, { durationSec: 6 }],
  ['營救', 'Rescue', 'utility', 120],
])
