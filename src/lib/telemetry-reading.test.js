import test from 'ava'
import {formatTelemetryAmount, formatTelemetryRange, formatTelemetryWhen, getTelemetryKind, getTelemetryLabel, getTelemetryTimes} from './telemetry-reading.js'

const parisEnd = '2026-07-02T06:00:00.125Z'
const meter = {calculationStrategy: 'METER', flowType: 'PRELEVEMENT'}

test('les périodes de télérelève conservent les dates et la précision nécessaires à leur lecture', t => {
  const start = Date.parse('2026-10-20T08:00:00Z')
  t.is(formatTelemetryRange(start), 'Le 20 octobre 2026 à 10 h')
  t.is(formatTelemetryRange(start, Date.parse('2026-10-21T08:00:00Z')), 'Du 20 au 21 octobre 2026 à 10 h')
  t.is(formatTelemetryRange(start, Date.parse('2026-10-21T09:00:00Z')), 'Du 20 octobre à 10 h au 21 octobre 2026 à 11 h')
  t.is(formatTelemetryRange(start, Date.parse('2026-10-20T08:15:03.001Z')), 'Le 20 octobre 2026, de 10 h à 10 h 15 min 03,001 s')
  t.is(formatTelemetryRange(start, Date.parse('2026-11-03T09:00:00Z')), 'Du 20 octobre au 3 novembre 2026 à 10 h')
  t.is(formatTelemetryRange(start, Date.parse('2027-01-01T09:00:00Z')), 'Du 20 octobre 2026 au 1er janvier 2027 à 10 h')
})

test('un index est placé à la fermeture de son créneau technique, avec sa précision', t => {
  const index = {metricTypeCode: 'index', value: '12345678901234567890123.123456789012345678901234567891',
    unit: 'm3', periodStart: '2026-07-02T05:45:00Z', periodEnd: parisEnd}
  t.deepEqual(getTelemetryTimes(index), {start: Date.parse(parisEnd), end: Date.parse(parisEnd)})
  t.is(formatTelemetryWhen(index), 'Le 2 juillet 2026 à 8 h 00 min 00,125 s')
  t.is(getTelemetryLabel(index), 'Index télérelevé')
  t.is(formatTelemetryAmount(index).replaceAll(/\s/g, ' '), '12 345 678 901 234 567 890 123,123456789012345678901234567891 m³')
})

test('un volume METER ne récupère aucune borne de date civile ou de durée nulle', t => {
  for (const value of [
    {periodStart: '2026-06-01', periodEnd: '2026-06-02'},
    {periodEnd: parisEnd},
    {periodStart: parisEnd, periodEnd: parisEnd},
    {periodStart: parisEnd, periodEnd: '2026-07-01T00:00:00Z'}
  ]) {
    const volume = {...value, metricTypeCode: 'volume'}
    t.deepEqual(getTelemetryTimes(volume, null, meter), {start: null, end: null})
    t.is(formatTelemetryWhen(volume, null, {...meter, minDate: '2026-06-01', maxDate: '2026-06-02'}), 'Période exacte non renseignée')
  }
})

test('un volume générique conserve ses bornes, sa nature et le sens du flux', t => {
  const start = '2026-03-28T23:00:00Z'
  const end = '2026-03-29T22:00:00Z'
  const direct = {metricTypeCode: 'volume', value: 0, unit: 'm3', periodStart: start, periodEnd: end}
  const computed = {...direct, valueKind: 'COMPUTED'}
  const rejected = {pointPrelevement: {flowType: 'REJET'}}
  t.is(getTelemetryKind(direct), 'direct')
  t.is(getTelemetryLabel(direct, rejected), 'Volume rejeté télérelevé')
  t.is(getTelemetryKind(computed), 'computed')
  t.is(getTelemetryLabel(computed, rejected), 'Volume rejeté calculé')
  t.is(formatTelemetryWhen(direct, {}, rejected), 'Du 29 au 30 mars 2026 à 0 h')
  t.is(formatTelemetryWhen({...direct, periodStart: end}), 'Le 30 mars 2026 à 0 h')
  t.is(formatTelemetryAmount(direct), '0 m³')
  t.is(formatTelemetryAmount({...direct, value: null}), 'Non renseignée')
})

test('les autres mesures conservent leur unité et leur libellé métier', t => {
  const flow = {metricTypeCode: 'débit', value: '0,125', unit: 'L/s', periodEnd: parisEnd}
  t.is(getTelemetryKind(flow), 'other')
  t.is(getTelemetryLabel(flow, meter), 'Débit prélevé')
  t.is(getTelemetryLabel({...flow, valueKind: 'COMPUTED'}, meter), 'Débit prélevé (calcul)')
  t.is(formatTelemetryAmount(flow), '0,125 L/s')
  t.is(formatTelemetryWhen(flow), 'Le 2 juillet 2026 à 8 h 00 min 00,125 s')
})

test('les deux occurrences de 02 h 30 au changement d’heure sont identifiables sur le relevé et le volume', t => {
  const start = '2026-10-25T00:30:00Z'
  const end = '2026-10-25T01:30:00Z'
  const first = formatTelemetryWhen({metricTypeCode: 'index', periodEnd: start})
  const second = formatTelemetryWhen({metricTypeCode: 'index', periodEnd: end})
  t.is(first, 'Le 25 octobre 2026 à 2 h 30 UTC+2')
  t.is(second, 'Le 25 octobre 2026 à 2 h 30 UTC+1')
  t.is(formatTelemetryWhen({metricTypeCode: 'volume', periodStart: start, periodEnd: end}), 'Le 25 octobre 2026, de 2 h 30 UTC+2 à 2 h 30 UTC+1')
  t.is(formatTelemetryWhen({metricTypeCode: 'index', periodEnd: '2026-10-25T02:30:00Z'}), 'Le 25 octobre 2026 à 3 h 30')
})
