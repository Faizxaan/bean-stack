import { describe, expect, it } from 'vitest'
import { daysUntilLocal, localDateString, smoothScrollBehavior } from './utils'

// Worker 3 (visual / accessibility / data safety): the Home interview
// countdown used to parse a YYYY-MM-DD date as midnight UTC, which in
// IST is 05:30 local — the count could be off by a day around midnight.
describe('daysUntilLocal (interview countdown in local time)', () => {
  const shift = (days: number) => localDateString(new Date(Date.now() + days * 86400000))
  it('is 0 today, 1 tomorrow, -1 yesterday', () => {
    expect(daysUntilLocal(localDateString())).toBe(0)
    expect(daysUntilLocal(shift(1))).toBe(1)
    expect(daysUntilLocal(shift(-1))).toBe(-1)
    expect(daysUntilLocal(shift(30))).toBe(30)
  })
  it('returns null for missing or impossible dates, never NaN', () => {
    expect(daysUntilLocal(null)).toBeNull()
    expect(daysUntilLocal(undefined)).toBeNull()
    expect(daysUntilLocal('')).toBeNull()
    expect(daysUntilLocal('not-a-date')).toBeNull()
    expect(daysUntilLocal('2026-02-30')).toBeNull()
    expect(daysUntilLocal('2026-13-01')).toBeNull()
  })
})

describe('smoothScrollBehavior (reduced motion)', () => {
  it('returns "auto" with no DOM (never throws outside a browser)', () => {
    expect(smoothScrollBehavior()).toBe('auto')
  })
})
