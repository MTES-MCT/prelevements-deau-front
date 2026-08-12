import test from 'ava'

import {
  CALENDAR_STATUS_COLORS,
  getCalendarStatusClassName
} from './calendar-colors.js'

test('getCalendarStatusClassName identifies known calendar colors', t => {
  t.is(
    getCalendarStatusClassName(CALENDAR_STATUS_COLORS.present),
    'app-calendar-status--present'
  )
  t.is(
    getCalendarStatusClassName(CALENDAR_STATUS_COLORS.noSampling),
    'app-calendar-status--noSampling'
  )
  t.is(
    getCalendarStatusClassName(CALENDAR_STATUS_COLORS.notDeclared),
    'app-calendar-status--notDeclared'
  )
})

test('getCalendarStatusClassName leaves custom data colors unchanged', t => {
  t.is(getCalendarStatusClassName('#123456'), '')
})
