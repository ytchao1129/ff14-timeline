import type { BossAction, SkillEntry } from '../types/timeline'
import { secToPx } from './timeScale'
import type { TimeRange } from './timeScale'

export const INSTANT_MARKER_PX = 10
const LABEL_OFFSET_PX = 6
const LANE_GAP_PX = 4

export interface Span {
  startPx: number
  endPx: number
}

export interface LaneAssignment {
  lanes: number[]
  laneCount: number
}

/**
 * Places each span in the first lane where it does not overlap the previous
 * span, so overlapping items are drawn on separate lines.
 */
export function assignLanes(spans: Span[], gapPx = LANE_GAP_PX): LaneAssignment {
  const order = spans
    .map((_, i) => i)
    .sort((a, b) => spans[a].startPx - spans[b].startPx || a - b)
  const laneEnds: number[] = []
  const lanes = new Array<number>(spans.length)

  for (const i of order) {
    const span = spans[i]
    let lane = laneEnds.findIndex((end) => end + gapPx <= span.startPx)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(span.endPx)
    } else {
      laneEnds[lane] = span.endPx
    }
    lanes[i] = lane
  }
  return { lanes, laneCount: Math.max(1, laneEnds.length) }
}

/** Rough label width: wide characters (CJK) count as 12px, others as 7px. */
export function estimateLabelPx(text: string): number {
  let width = 0
  for (const ch of text) width += (ch.codePointAt(0) ?? 0) > 0xff ? 12 : 7
  return width + LABEL_OFFSET_PX * 2
}

export interface BossActionLayout {
  action: BossAction
  leftPx: number
  widthPx: number
  instant: boolean
  /** True when the name does not fit inside the cast bar and is drawn after it. */
  labelOutside: boolean
  lane: number
}

export function layoutBossActions(
  actions: BossAction[],
  range: TimeRange,
  pxPerSec: number,
): { items: BossActionLayout[]; laneCount: number } {
  const base = actions.map((action) => {
    const instant = action.castEndSec === action.castStartSec
    const widthPx = (action.castEndSec - action.castStartSec) * pxPerSec
    const labelPx = estimateLabelPx(action.name)
    return {
      action,
      instant,
      leftPx: secToPx(action.castStartSec, range, pxPerSec),
      widthPx,
      labelPx,
      labelOutside: !instant && labelPx > widthPx,
    }
  })

  // Labels drawn outside a marker or bar count toward the occupied width.
  const spans = base.map(({ instant, leftPx, widthPx, labelPx, labelOutside }) => {
    if (instant) {
      return { startPx: leftPx - INSTANT_MARKER_PX / 2, endPx: leftPx + INSTANT_MARKER_PX / 2 + labelPx }
    }
    return { startPx: leftPx, endPx: leftPx + widthPx + (labelOutside ? labelPx : 0) }
  })

  const { lanes, laneCount } = assignLanes(spans)
  return {
    items: base.map(({ labelPx: _labelPx, ...item }, i) => ({ ...item, lane: lanes[i] })),
    laneCount,
  }
}

export interface SkillEntryLayout {
  entry: SkillEntry
  leftPx: number
  lane: number
}

export function layoutSkillEntries(
  entries: SkillEntry[],
  range: TimeRange,
  pxPerSec: number,
): { items: SkillEntryLayout[]; laneCount: number } {
  const lefts = entries.map((entry) => secToPx(entry.timeSec, range, pxPerSec))
  const { lanes, laneCount } = assignLanes(
    entries.map((entry, i) => ({ startPx: lefts[i], endPx: lefts[i] + estimateLabelPx(entry.label) })),
  )
  return {
    items: entries.map((entry, i) => ({ entry, leftPx: lefts[i], lane: lanes[i] })),
    laneCount,
  }
}
