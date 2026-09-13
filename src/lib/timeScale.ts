import { PREPULL_SEC } from '../types/timeline'
import type { Encounter } from '../types/timeline'

/** Selectable zoom levels in pixels per second. */
export const ZOOM_LEVELS = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48] as const
export const DEFAULT_ZOOM_INDEX = 4

const TICK_STEPS_SEC = [1, 2, 5, 10, 15, 30, 60, 120, 300]
const MIN_TICK_SPACING_PX = 56

export interface TimeRange {
  startSec: number
  endSec: number
}

/** From the prepull countdown to the end of the encounter or its last item. */
export function getTimelineRange(encounter: Encounter): TimeRange {
  const lastBossSec = Math.max(0, ...encounter.bossActions.map((a) => a.castEndSec))
  const lastSkillSec = Math.max(
    0,
    ...encounter.players.flatMap((p) => p.entries.map((e) => e.timeSec)),
  )
  return {
    startSec: -PREPULL_SEC,
    endSec: Math.max(encounter.durationSec, lastBossSec, lastSkillSec),
  }
}

export function secToPx(sec: number, range: TimeRange, pxPerSec: number): number {
  return (sec - range.startSec) * pxPerSec
}

/** Smallest step that keeps tick labels at least MIN_TICK_SPACING_PX apart. */
export function chooseTickStep(pxPerSec: number): number {
  return (
    TICK_STEPS_SEC.find((step) => step * pxPerSec >= MIN_TICK_SPACING_PX) ??
    TICK_STEPS_SEC[TICK_STEPS_SEC.length - 1]
  )
}

export function buildTicks(range: TimeRange, stepSec: number): number[] {
  const ticks: number[] = []
  // `+ 0` turns -0 into 0.
  for (let t = Math.ceil(range.startSec / stepSec) * stepSec + 0; t <= range.endSec; t += stepSec) {
    ticks.push(t)
  }
  return ticks
}

/** Formats seconds as m:ss, keeping one decimal place when needed (e.g. -0:16, 1:05.5). */
export function formatTime(sec: number): string {
  const tenths = Math.round(Math.abs(sec) * 10)
  const sign = sec < 0 && tenths > 0 ? '-' : ''
  const minutes = Math.floor(tenths / 600)
  const remainder = tenths - minutes * 600
  const seconds = String(Math.floor(remainder / 10)).padStart(2, '0')
  const fraction = remainder % 10
  return `${sign}${minutes}:${seconds}${fraction ? `.${fraction}` : ''}`
}
