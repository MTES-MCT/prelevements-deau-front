import test from 'ava'
import {formatMeterCoveredPeriod, formatMeterExactPeriod, getMeterPeriod} from './meter-period.js'
import {getSourcePeriod, getSourcePeriodLabel} from './declaration.js'

const source = (periodStart, periodEnd) => ({type: 'API', metadata: {calculationStrategy: 'METER', periodStart, periodEnd}})

test('le volume du premier janvier ne devient pas une période de décembre', t => {
  const item = source('2025-12-31T23:00:00Z', '2026-01-01T23:00:00Z')
  t.is(getSourcePeriodLabel(item), '01/01/2026')
  t.is(getSourcePeriod(item).start.toISOString(), '2025-12-31T23:00:00.000Z')
  t.is(formatMeterExactPeriod(getMeterPeriod(item)), 'Du 01/01/2026 00:00:00 au 02/01/2026 00:00:00')
})

test('les journées de 23 et 25 heures restent leurs vrais jours de Paris', t => {
  for (const [start, end, label] of [
    ['2026-03-28T23:00:00Z', '2026-03-29T22:00:00Z', '29/03/2026'],
    ['2026-10-24T22:00:00Z', '2026-10-25T23:00:00Z', '25/10/2026']
  ]) t.is(getSourcePeriodLabel(source(start, end)), label)
})

test('la fin exclusive ne retranche pas une journée quand elle ne tombe pas à minuit', t => {
  const period = getMeterPeriod(source('2026-08-31T22:00:00Z', '2026-09-01T22:00:00.001Z'))
  t.is(formatMeterCoveredPeriod(period), '01/09/2026 au 02/09/2026')
  t.regex(formatMeterExactPeriod(period), /02\/09\/2026 00:00:00,001/)
})

test('les bornes exactes du chunk sont prioritaires, sans réinterprétation des anciennes dates', t => {
  const item = source('2025-12-31T23:00:00Z', '2026-01-02T23:00:00Z')
  const chunk = {calculationStrategy: 'METER', minDate: '2025-12-31', maxDate: '2026-01-01',
    metadata: {periodStart: '2026-01-01T23:00:00Z', periodEnd: '2026-01-02T23:00:00Z'}}
  t.is(formatMeterCoveredPeriod(getMeterPeriod(item, chunk)), '02/01/2026')
  const fallback = {...chunk, metadata: {}, chunkValues: [{periodStart: '2026-01-01T23:00:00Z', periodEnd: '2026-01-02T23:00:00Z'}]}
  t.is(formatMeterCoveredPeriod(getMeterPeriod(item, fallback)), '02/01/2026')
  t.is(getMeterPeriod(item, {...chunk, metadata: {}}), null)
  t.is(getSourcePeriodLabel({type: 'API', metadata: {calculationStrategy: 'METER'}, chunks: [{minDate: '2026-01-01', maxDate: '2026-01-02'}]}), null)
  t.is(getSourcePeriodLabel({chunks: [{minDate: '2025-12-31', maxDate: '2026-01-01'}]}), 'déc. 2025 à janv. 2026')
})

test('une date sans offset ou une période nulle ne devient pas un instant compteur', t => {
  t.is(getMeterPeriod(source('2026-01-01', '2026-01-02')), null)
  t.is(getMeterPeriod(source('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')), null)
})

test('le repli sur les chunks ne réintroduit pas une période rejetée dans la source', t => {
  const rejected = {calculationStrategy: 'METER', instructionStatus: 'REJECTED',
    metadata: {periodStart: '2025-12-31T23:00:00Z', periodEnd: '2026-01-01T23:00:00Z'}}
  const active = {...rejected, instructionStatus: 'AUTOMATICALLY_VALIDATED',
    metadata: {periodStart: '2026-01-01T23:00:00Z', periodEnd: '2026-01-02T23:00:00Z'}}
  const item = {...source(), chunks: [rejected, active]}
  t.is(getSourcePeriodLabel(item), '02/01/2026')
  t.is(getSourcePeriodLabel({...item, chunks: [rejected]}), null)
  t.is(formatMeterCoveredPeriod(getMeterPeriod(item, rejected)), '01/01/2026')
})
