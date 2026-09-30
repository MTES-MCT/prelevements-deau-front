import test from 'ava'

import {buildDashboardLocation, readLegacyDashboardHash} from './dashboard-url.js'

const filters = {zoneCodes: ['DEP-47'], periodType: 'month', period: '2026-08', year: 2025, waterBodyTypes: ['SOUTERRAIN']}

test('les filtres persistés sont lisibles au SSR et conservent les options ressource', t => {
  const location = new URL('https://app.example.test/tableau-de-bord?source=link#dashboard?zones=DEP-33&year=2026&piezoMode=depth&flowPeriod=month')
  const result = new URL(buildDashboardLocation(location, filters), location)
  t.is(result.pathname, '/tableau-de-bord')
  t.deepEqual(Object.fromEntries(result.searchParams), {
    source: 'link', zones: 'DEP-47', periodType: 'month', period: '2026-08', year: '2025', waterBodyTypes: 'SOUTERRAIN'
  })
  t.is(result.hash, '#dashboard?piezoMode=depth&flowPeriod=month')
  t.is(readLegacyDashboardHash(result), null)
})

test('les anciens fragments territoriaux restent reconnus avant migration', t => {
  const location = new URL('https://app.example.test/tableau-de-bord#dashboard?zones=DEP-47&year=2025')
  t.is(readLegacyDashboardHash(location), location.hash)
  const migrated = new URL(buildDashboardLocation(location, filters), location)
  t.is(migrated.hash, '')
  t.is(migrated.searchParams.get('zones'), 'DEP-47')
})

test('la query est prioritaire et un fragment ressource seul ne relance pas le territoire', t => {
  t.is(readLegacyDashboardHash(new URL('https://app.example.test/tableau-de-bord?zones=DEP-47#dashboard?zones=DEP-33')), null)
  t.is(readLegacyDashboardHash(new URL('https://app.example.test/tableau-de-bord#dashboard?piezoMode=depth')), null)
})

test('aucun milieu et ancre ordinaire sont conservés sans ancien alias ambigu', t => {
  const location = new URL('https://app.example.test/tableau-de-bord?waterBodyType=SUPERFICIELLE#ressources')
  const result = new URL(buildDashboardLocation(location, {...filters, waterBodyTypes: []}), location)
  t.is(result.hash, '#ressources')
  t.is(result.searchParams.get('waterBodyTypes'), '__none__')
  t.false(result.searchParams.has('waterBodyType'))
})
