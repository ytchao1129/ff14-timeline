// Accepts plain seconds ("75", "75.5") or m:ss ("1:15", "1:15.5"), optionally negative.
const TIME_PATTERN = /^(-)?(?:(\d+):([0-5]?\d(?:\.\d)?)|(\d+(?:\.\d)?))$/

/** Parses user-entered time text into seconds; returns null when the format is invalid. */
export function parseTimeInput(text: string): number | null {
  const match = TIME_PATTERN.exec(text.trim())
  if (!match) return null
  const [, sign, minutes, seconds, plain] = match
  const value = plain !== undefined ? Number(plain) : Number(minutes) * 60 + Number(seconds)
  // Round away floating point noise such as 60 + 15.1; `+ 0` turns -0 into 0.
  return Math.round((sign ? -value : value) * 10) / 10 + 0
}
