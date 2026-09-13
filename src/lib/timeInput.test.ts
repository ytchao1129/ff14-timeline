import { describe, expect, it } from 'vitest'
import { parseTimeInput } from './timeInput'
import { formatTime } from './timeScale'

describe('parseTimeInput', () => {
  it.each([
    ['75', 75],
    ['75.5', 75.5],
    ['1:15', 75],
    ['1:05.5', 65.5],
    ['1:5', 65],
    ['0:00', 0],
    ['10:00', 600],
    ['-0:16', -16],
    ['-16', -16],
    ['-0', 0],
    ['  30  ', 30],
    ['1:15.1', 75.1],
  ])('parses %j as %s', (text, expected) => {
    expect(parseTimeInput(text)).toBe(expected)
  })

  it.each(['', ' ', 'abc', '1:60', '1:5.55', '75.55', '1::15', '1:', ':15', '+5', '1e2'])(
    'rejects %j',
    (text) => {
      expect(parseTimeInput(text)).toBeNull()
    },
  )

  it('accepts everything formatTime produces', () => {
    for (const sec of [-16, -0.5, 0, 8, 65.5, 599.9, 600]) {
      expect(parseTimeInput(formatTime(sec))).toBe(sec)
    }
  })
})
