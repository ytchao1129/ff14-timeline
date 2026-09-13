// DRAFT: based on patch 7.x at level 100. Names and numbers are unverified;
// check them against the game before relying on them.
import type { SkillDef } from '../../types/timeline'
import { defineSkills } from './define'

export const TANK_SKILLS: Record<string, SkillDef[]> = {
  PLD: defineSkills('PLD', [
    ['極致護衛', 'Guardian', 'mitigation', 120, { durationSec: 15 }],
    ['神聖領域', 'Hallowed Ground', 'mitigation', 420, { durationSec: 10 }],
    ['壁壘', 'Bulwark', 'mitigation', 90, { durationSec: 10 }],
    ['聖盾陣', 'Holy Sheltron', 'mitigation', 5, { durationSec: 8 }],
    ['干預', 'Intervention', 'mitigation', 10, { durationSec: 8 }],
    ['保護', 'Cover', 'mitigation', 120, { durationSec: 12 }],
    ['聖光幕簾', 'Divine Veil', 'party', 90, { durationSec: 30 }],
    ['武裝戍衛', 'Passage of Arms', 'party', 120],
    ['戰逃反應', 'Fight or Flight', 'buff', 60, { durationSec: 20 }],
    ['安魂祈禱', 'Requiescat', 'buff', 60],
  ]),
  WAR: defineSkills('WAR', [
    ['戮罪', 'Damnation', 'mitigation', 120, { durationSec: 15 }],
    ['死鬥', 'Holmgang', 'mitigation', 240, { durationSec: 10 }],
    ['戰慄', 'Thrill of Battle', 'mitigation', 90, { durationSec: 10 }],
    ['原初的血氣', 'Bloodwhetting', 'mitigation', 25, { durationSec: 8 }],
    ['原初的勇猛', 'Nascent Flash', 'mitigation', 25, { durationSec: 8 }],
    ['泰然自若', 'Equilibrium', 'heal', 60],
    ['擺脫', 'Shake It Off', 'party', 90, { durationSec: 30 }],
    ['原初的解放', 'Inner Release', 'buff', 60, { durationSec: 15 }],
    ['戰嚎', 'Infuriate', 'buff', 60, { charges: 2 }],
  ]),
  DRK: defineSkills('DRK', [
    ['暗影衛', 'Shadowed Vigil', 'mitigation', 120, { durationSec: 15 }],
    ['行屍走肉', 'Living Dead', 'mitigation', 300, { durationSec: 10 }],
    ['彌散魔', 'Dark Mind', 'mitigation', 60, { durationSec: 10 }],
    ['至黑之夜', 'The Blackest Night', 'mitigation', 15, { durationSec: 7 }],
    ['獻奉', 'Oblation', 'mitigation', 60, { durationSec: 10, charges: 2 }],
    ['暗黑佈道', 'Dark Missionary', 'party', 90, { durationSec: 15 }],
    ['血亂', 'Delirium', 'buff', 60, { durationSec: 15 }],
    ['掠影示現', 'Living Shadow', 'buff', 120, { durationSec: 20 }],
  ]),
  GNB: defineSkills('GNB', [
    ['大星雲', 'Great Nebula', 'mitigation', 120, { durationSec: 15 }],
    ['超火流星', 'Superbolide', 'mitigation', 360, { durationSec: 10 }],
    ['偽裝', 'Camouflage', 'mitigation', 90, { durationSec: 20 }],
    ['剛玉之心', 'Heart of Corundum', 'mitigation', 25, { durationSec: 8 }],
    ['極光', 'Aurora', 'heal', 60, { durationSec: 18, charges: 2 }],
    ['光之心', 'Heart of Light', 'party', 90, { durationSec: 15 }],
    ['無情', 'No Mercy', 'buff', 60, { durationSec: 20 }],
    ['血壤', 'Bloodfest', 'buff', 120],
  ]),
}
