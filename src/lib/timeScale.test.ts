import { describe, expect, it } from 'vitest'
import { createSampleEncounter } from '../data/sample'
import {
  buildTicks,
  chooseTickStep,
  dragTimeSec,
  formatTime,
  getTimelineRange,
  secToPx,
} from './timeScale'

describe('getTimelineRange', () => {
  it('starts 16 seconds before the pull and ends at the encounter duration', () => {
    const encounter = createSampleEncounter()
    expect(getTimelineRange(encounter)).toEqual({ startSec: -16, endSec: encounter.durationSec })
  })

  it('extends to items placed after the duration', () => {
    const encounter = createSampleEncounter()
    encounter.bossActions[0].castEndSec = encounter.durationSec + 30
    expect(getTimelineRange(encounter).endSec).toBe(encounter.durationSec + 30)
  })

  it('handles an encounter without actions or players', () => {
    const encounter = { ...createSampleEncounter(), bossActions: [], players: [] }
    expect(getTimelineRange(encounter)).toEqual({ startSec: -16, endSec: encounter.durationSec })
  })
})

describe('secToPx', () => {
  it('maps the prepull start to 0 and the pull to 16 seconds of width', () => {
    const range = { startSec: -16, endSec: 100 }
    expect(secToPx(-16, range, 8)).toBe(0)
    expect(secToPx(0, range, 8)).toBe(128)
  })
})

describe('dragTimeSec', () => {
  it('converts the drag distance to seconds and snaps to the step', () => {
    expect(dragTimeSec(10, 50, 8, 1, -16, 600)).toBe(16)
    expect(dragTimeSec(10, -20, 8, 1, -16, 600)).toBe(8)
    expect(dragTimeSec(12.5, 3, 8, 1, -16, 600)).toBe(13)
    expect(dragTimeSec(10, 10, 8, 0.1, -16, 600)).toBe(11.3)
  })

  it('stays within the allowed range', () => {
    expect(dragTimeSec(-10, -400, 8, 1, -16, 600)).toBe(-16)
    expect(dragTimeSec(590, 400, 8, 1, -16, 600)).toBe(600)
  })

  it('never returns -0', () => {
    expect(Object.is(dragTimeSec(1, -8, 8, 1, -16, 600), 0)).toBe(true)
    expect(Object.is(dragTimeSec(0.4, -6, 8, 1, -16, 600), 0)).toBe(true)
  })
})

describe('chooseTickStep', () => {
  it('uses wider steps when zoomed out', () => {
    expect(chooseTickStep(48)).toBe(2)
    expect(chooseTickStep(8)).toBe(10)
    expect(chooseTickStep(2)).toBe(30)
  })
})

describe('buildTicks', () => {
  it('includes multiples of the step inside the range, including 0', () => {
    expect(buildTicks({ startSec: -16, endSec: 20 }, 10)).toEqual([-10, 0, 10, 20])
  })

  it('never produces -0', () => {
    const ticks = buildTicks({ startSec: -4, endSec: 5 }, 5)
    expect(Object.is(ticks[0], 0)).toBe(true)
  })
})

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [-16, '-0:16'],
    [75, '1:15'],
    [65.5, '1:05.5'],
    [59.96, '1:00'],
    [-0.01, '0:00'],
    [600, '10:00'],
  ])('formats %s as %s', (sec, expected) => {
    expect(formatTime(sec)).toBe(expected)
  })
})
