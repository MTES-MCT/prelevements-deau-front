import test from 'ava'
import {isSampleInCalendarRange, includeExactReadingBounds} from '../exact-reading-range.js'

test('la date compteur conserve minuit Paris même avec navigateur UTC et le passage DST', t => {
  for (const [date, instant] of [['2026-09-02', '2026-09-01T22:02:43Z'], ['2026-10-25', '2026-10-24T22:02:43Z'], ['2026-10-26', '2026-10-25T23:02:43Z']]) {
    const [year, month, day] = date.split('-').map(Number)
    const start = new Date(year, month - 1, day)
    const end = new Date(year, month - 1, day + 1)
    const sample = {date, observedAt: instant, timestamp: new Date(instant)}
    t.true(isSampleInCalendarRange(sample, start, end))
    t.false(isSampleInCalendarRange(sample, end, new Date(year, month - 1, day + 2)))
    const bounds = includeExactReadingBounds({start, end: start}, [sample])
    t.true(bounds.start <= sample.timestamp)
    t.is(sample.timestamp.toISOString(), new Date(instant).toISOString())
  }
})

test('les séries historiques conservent leurs bornes timestamp', t => {
  const start = new Date(2026, 8, 2)
  const end = new Date(2026, 8, 3)
  const range = {start, end}
  t.false(isSampleInCalendarRange({timestamp: new Date(start - 1)}, start, end))
  t.true(isSampleInCalendarRange({timestamp: start}, start, end))
  t.deepEqual(includeExactReadingBounds(range, [{timestamp: new Date(start - 1)}]), range)
})
