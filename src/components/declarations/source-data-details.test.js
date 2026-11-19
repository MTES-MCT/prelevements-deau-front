import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'
import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import htmlParser from 'next/dist/compiled/node-html-parser/index.js'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const require = createRequire(import.meta.url)
function loadComponent(name) {
  const filename = new URL(name, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {
    filename: filename.pathname,
    jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'},
    module: {type: 'commonjs'}
  })
  const compiled = {exports: {}}
  const componentRequire = specifier => {
    if (specifier === '@codegouvfr/react-dsfr/Alert') return {Alert: () => null}
    if (specifier === '@/components/declarations/native-values-preview.js') return () => null
    if (specifier.startsWith('@/components/declarations/')) return loadComponent('./' + specifier.split('/').at(-1))
    if (specifier.startsWith('@/')) return require('../../' + specifier.slice(2))
    return require(specifier)
  }
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiled, compiled.exports)
  return compiled.exports
}
const SourceDataDetails = loadComponent('./source-data-details.js').default

const campaign = {collectionCampaignId: 'campagne-test', collectionResponseId: 'reponse-test'}

function reading(id, day, value, extra = {}) {
  return {
    id, metricTypeCode: 'index', unit: 'm³', valueKind: 'DECLARED', value,
    periodStart: day + 'T00:00:00.000Z', periodEnd: day + 'T00:15:00.000Z', ...extra
  }
}

function chunk(value, {meter = 'A', point = 'nord', history = [], usage} = {}) {
  return {
    id: 'chunk-' + value.id, compteurId: 'meter-' + meter, compteur: {id: 'meter-' + meter, serialNumber: 'COMPTEUR-' + meter},
    pointPrelevementId: 'point-' + point, pointPrelevement: {id: 'point-' + point, name: 'Forage ' + point},
    metadata: {measurementType: 'INDEX', readingDate: value.periodStart.slice(0, 10), serialNumber: 'COMPTEUR-' + meter},
    chunkValues: [value], latestIndexReadings: history, usage
  }
}

function renderQuick(chunks, metadata = {}) {
  const source = {id: 'source-test', type: 'DECLARATION', chunks, metadata: {manualQuickDeclaration: true, measurementType: 'INDEX', ...metadata}}
  return htmlParser.parse(renderToStaticMarkup(createElement(SourceDataDetails, {source, currentRole: 'DECLARANT'})))
}

function cells(container) {
  return container.querySelectorAll('tbody tr').map(row => row.querySelectorAll('td').map(cell => cell.textContent.trim().replaceAll(/\s+/g, ' ')))
}

test('une campagne affiche une fois chaque index déclaré à sa date, même lorsque les index sont égaux', t => {
  const readings = [
    reading('fin', '2026-10-31', 12400),
    reading('debut', '2025-11-01', 12400),
    reading('milieu', '2026-05-31', 12400)
  ]
  const history = readings.map(value => ({...value, compteurId: 'meter-A', sourceId: 'source-test'}))
  const page = renderQuick(readings.map(value => chunk(value, {history})), campaign)

  t.is(page.querySelectorAll('article').length, 1)
  t.is(page.querySelectorAll('table').length, 1)
  t.is(page.querySelectorAll('details').length, 0)
  t.deepEqual(cells(page), [
    ['01/11/2025', '12 400 m³'],
    ['31/05/2026', '12 400 m³'],
    ['31/10/2026', '12 400 m³']
  ])
  t.truthy(page.querySelector('a[href="/campagnes/campagne-test/reponses/reponse-test"]'))
  t.truthy(page.querySelector('a[href="/points-prelevement/point-nord"]'))
})

test('deux compteurs sur un même point et un compteur partagé entre deux points restent identifiables', t => {
  const day = '2026-09-01'
  const page = renderQuick([
    chunk(reading('a1', day, 200)),
    chunk(reading('a2', day, 95), {meter: 'B'}),
    chunk(reading('a3', day, 200), {point: 'sud'})
  ], campaign)
  const articles = page.querySelectorAll('article')
  t.is(articles.length, 3)
  for (const [point, meter, value] of [['nord', 'A', '200 m³'], ['nord', 'B', '95 m³'], ['sud', 'A', '200 m³']]) {
    const article = articles.find(item => item.textContent.includes('Forage ' + point) && item.textContent.includes('COMPTEUR-' + meter))
    t.truthy(article)
    t.deepEqual(cells(article), [['01/09/2026', value]])
  }
})

test('le graphique place les index jusqu’à la date de la déclaration et conserve un index nul', t => {
  const value = reading('actuel', '2026-05-27', 315)
  const other = reading('autre', '2026-04-01', 0, {sourceId: 'autre-source', compteurId: 'meter-A'})
  const later = reading('ultérieur', '2027-01-08', 820)
  const middle = reading('intermédiaire', '2026-04-25', 180)
  const page = renderQuick([chunk(value, {history: [later, value, other, middle]})])
  const figure = page.querySelector('figure[aria-label="Index et volumes"]')
  t.is(figure.querySelector('svg > title').textContent, 'Index et volumes au fil du temps, en mètres cubes')
  t.is(figure.querySelectorAll('details').length, 1)
  const points = figure.querySelectorAll('svg circle[data-mark="index"]')
  t.is(points.length, 3)
  const positions = points.map(point => Number(point.getAttribute('cx')))
  t.is(new Set(positions).size, 3)
  t.true(positions.every(Number.isFinite))
  t.regex(page.textContent, /01\/04\/2026/)
  t.regex(page.textContent, /27\/05\/2026/)
  t.regex(page.textContent, /315 m³/)
  t.regex(page.textContent, /0 m³/)
})

test('l’historique et les volumes calculés ne remplacent pas un index déclaré manquant', t => {
  const prior = reading('précédent', '2026-01-10', 8)
  const empty = chunk(prior, {history: [prior]})
  empty.chunkValues = [{...prior, id: 'volume', value: 99, metricTypeCode: 'volume prélevé', valueKind: 'COMPUTED'}]
  const page = renderQuick([empty])
  t.falsy(page.querySelectorAll('th').find(header => header.textContent.trim() === 'Index déclaré'))
  t.regex(page.textContent, /8 m³/)
})

test('une valeur écrasée reste attachée à son relevé et les usages sont associés aux bonnes dates', t => {
  const initial = reading('initial', '2026-01-10', '12.234567890123456789', {isOverwritten: true, valueStatus: 'OVERWRITTEN', overwrittenBy: {value: '18.456789012345678901', unit: 'm³'}})
  const next = reading('suivant', '2026-05-10', 24)
  const page = renderQuick([
    chunk(next, {history: [{...initial}], usage: {code: '2', label: 'Irrigation'}}),
    chunk(initial, {usage: {code: '3A', label: 'Abreuvage'}})
  ])
  t.is(page.querySelectorAll('article').length, 1)
  t.is(page.querySelectorAll('tbody[aria-label="Historique"]').length, 0)
  const rows = page.querySelector('tbody[aria-label="Cette déclaration"]').querySelectorAll('tr').filter(row => row.querySelector('td'))
  t.is(rows.length, 2)
  t.regex(rows[0].textContent, /10\/05\/2026/)
  t.regex(rows[0].textContent, /24 m³/)
  t.regex(rows[0].textContent, /Irrigation/)
  t.notRegex(rows[0].textContent, /Remplacée|Abreuvage/)
  t.regex(rows[1].textContent, /10\/01\/2026/)
  t.is(rows[1].querySelector('del').textContent, '12,234567890123456789 m³')
  t.regex(rows[1].textContent, /Remplacée par 18,456789012345678901 m³/)
  t.regex(rows[1].textContent, /Abreuvage/)
})

test('les quatre décimales saisies permettent de distinguer deux index proches et leur correction', t => {
  const value = reading('corrigé', '2026-10-31', '999999999999.9998', {
    valueStatus: 'OVERWRITTEN', overwrittenBy: {value: '999999999999.9999', unit: 'm³'}
  })
  const page = renderQuick([chunk(value)], campaign)
  const row = page.querySelector('tbody tr').textContent
  t.regex(row, /999\s999\s999\s999,9998 m³/)
  t.regex(row, /Remplacée par 999\s999\s999\s999,9999 m³/)
})

function computedVolume(value) {
  return {
    id: 'volume-calculé', metricTypeCode: 'volume', valueKind: 'COMPUTED', value, unit: 'm³',
    periodStart: '2026-05-14T00:15:00.000Z', periodEnd: '2026-06-18T00:15:00.000Z'
  }
}

test('les index reliés et les volumes partagent les dates et gardent deux échelles, y compris un zéro et une baisse', t => {
  const dates = ['2026-07-01', '2026-07-11', '2026-07-21', '2026-07-31']
  const indexes = [100, 140, 140, 5]
  const chunks = dates.map((day, i) => chunk(reading('index-' + i, day, indexes[i])))
  for (const [i, value] of [40, 0, 5].entries()) {
    chunks[i + 1].chunkValues.push({...computedVolume(value), id: 'volume-' + i, periodStart: dates[i], periodEnd: dates[i + 1]})
  }
  const plot = renderQuick(chunks).querySelector('figure svg')
  const position = (element, name) => Number(element.getAttribute(name))
  const points = dates.map(day => plot.querySelector(`circle[data-mark="index"][data-day="${day}"]`))
  const volumes = dates.slice(1).map(day => plot.querySelector(`[data-mark="volume"][data-end="${day}"]`))
  const [rise, stable, reset] = volumes
  const indexPanel = plot.querySelector('g[aria-label="Index du compteur"]')
  const volumePanel = plot.querySelector('g[aria-label="Volumes par période"]')
  t.is(indexPanel.querySelectorAll('[data-mark="index"]').length, 4)
  t.is(indexPanel.querySelectorAll('[data-mark="volume"]').length, 0)
  t.is(volumePanel.querySelectorAll('[data-mark="volume"]').length, 3)
  const connections = indexPanel.querySelectorAll('[data-index-connection]')
  t.deepEqual(connections.map(line => [position(line, 'x1'), position(line, 'x2')]), [
    [position(points[0], 'cx'), position(points[1], 'cx')],
    [position(points[1], 'cx'), position(points[2], 'cx')]
  ])

  t.is(rise.parentNode.querySelector('text').textContent, '40 m³')
  t.is(stable.parentNode.querySelector('text').textContent, '0 m³')
  t.is(position(rise, 'x'), position(points[0], 'cx'))
  t.is(position(rise, 'width'), position(points[1], 'cx') - position(points[0], 'cx'))
  const baseline = position(stable, 'y1')
  t.is(position(rise, 'y') + position(rise, 'height'), baseline)
  t.true(position(rise, 'y') > Math.max(...points.map(point => position(point, 'cy'))))

  t.is(stable.tagName, 'LINE')
  t.is(position(stable, 'x1'), position(points[1], 'cx'))
  t.is(position(stable, 'x2'), position(points[2], 'cx'))
  t.is(position(stable, 'y2'), baseline)

  t.is(position(reset, 'x'), position(points[2], 'cx'))
  t.is(position(reset, 'width'), position(points[3], 'cx') - position(points[2], 'cx'))
  t.true(position(reset, 'y') > Math.max(...points.map(point => position(point, 'cy'))))
  t.is(position(reset, 'y') + position(reset, 'height'), baseline)
  t.is(position(rise, 'height') / position(reset, 'height'), 40 / 5)
})

test('la ligne des index s’interrompt lorsqu’une date contient deux relevés distincts', t => {
  const chunks = [
    chunk(reading('début', '2026-01-10', 10)),
    chunk(reading('milieu-a', '2026-01-20', 12)),
    chunk(reading('milieu-b', '2026-01-20', 15)),
    chunk(reading('suite', '2026-01-25', 20)),
    chunk(reading('fin', '2026-01-31', 30))
  ]
  const panel = renderQuick(chunks).querySelector('svg g[aria-label="Index du compteur"]')
  const links = panel.querySelectorAll('[data-index-connection]')
  t.is(links.length, 1)
  t.is(links[0].getAttribute('x1'), panel.querySelector('[data-value="20"]').getAttribute('cx'))
  t.is(links[0].getAttribute('x2'), panel.querySelector('[data-value="30"]').getAttribute('cx'))
})

test('les volumes directement saisis portent leur unité sur les périodes et sur leur axe', t => {
  const period = {measurementType: 'VOLUME', periodStartDate: '2026-06-01', periodEndDate: '2026-06-30'}
  const current = {...computedVolume('83'), id: 'juin', valueKind: 'DECLARED', unit: 'm³'}
  const previous = {...current, id: 'mai', value: '72.5', periodStartDate: '2026-05-01', periodEndDate: '2026-05-31'}
  const entry = {...chunk(current), flowType: 'PRELEVEMENT', metadata: period, quickReadingHistory: {volumes: [previous, {...previous, id: 'avril', periodStartDate: '2026-04-01', periodEndDate: '2026-04-30'}]}}
  const plot = renderQuick([entry], period).querySelector('figure svg')
  const may = plot.querySelector('[data-mark="volume"][data-value="72.5"]')
  t.is(may.parentNode.querySelector('text').textContent, '72,5 m³')
  const labels = plot.querySelectorAll('text').map(node => node.textContent)
  t.true(labels.includes('0 m³'))
  t.true(labels.includes('90 m³'))
  const scope = plot.querySelectorAll('[data-scope-range]')
  t.deepEqual(scope.map(range => ['data-start', 'data-end'].map(key => Number(range.getAttribute(key)))), [
    ['2026-06-01', '2026-07-01'].map(Date.parse)
  ])
})

test('deux zones distinctes représentent les volumes du point à leurs vraies dates et laissent le trou vide', t => {
  const value = reading('actuel', '2026-06-18', 700)
  const withdrawal = chunk(value)
  withdrawal.flowType = 'PRELEVEMENT'
  withdrawal.chunkValues.push(computedVolume('12.2345'))
  withdrawal.chunkValues.push({...computedVolume('8'), id: 'intervalle-précédent',
    periodStart: '2026-05-03T00:15:00.000Z', periodEnd: '2026-05-08T00:15:00.000Z'})
  withdrawal.chunkValues.push({...computedVolume('391'), id: 'intervalle-écrasé', valueStatus: 'OVERWRITTEN'})
  const discharge = chunk(reading('autre', '2026-06-18', 1580), {point: 'sud'})
  discharge.flowType = 'REJET'
  discharge.chunkValues.push({...computedVolume('0'), id: 'volume-rejeté'})
  const page = renderQuick([withdrawal, discharge], {totalWaterVolume: 596})
  const [calculated, rejected] = page.querySelectorAll('figure[aria-label="Index et volumes"]')
  const zones = calculated.querySelectorAll('svg rect[data-mark="volume"]')
  t.deepEqual(zones.map(zone => ['data-start', 'data-end', 'data-value'].map(key => zone.getAttribute(key))), [
    ['2026-05-03', '2026-05-08', '8'],
    ['2026-05-14', '2026-06-18', '12.2345']
  ])
  const endOfFirstZone = Number(zones[0].getAttribute('x')) + Number(zones[0].getAttribute('width'))
  t.true(endOfFirstZone < Number(zones[1].getAttribute('x')))
  t.true(Number(zones[0].getAttribute('width')) < Number(zones[1].getAttribute('width')))
  t.true(zones.every(zone => Number(zone.getAttribute('height')) > 0))
  t.deepEqual(calculated.querySelectorAll('[data-scope-range]').map(range =>
    ['data-start', 'data-end'].map(key => Number(range.getAttribute(key)))), [
    ['2026-05-03', '2026-05-08'].map(Date.parse),
    ['2026-05-14', '2026-06-18'].map(Date.parse)
  ])
  const gap = calculated.querySelector('[data-volume-gap]')
  t.is(Number(gap.getAttribute('data-start')), Date.parse('2026-05-08'))
  t.is(Number(gap.getAttribute('data-end')), Date.parse('2026-05-14'))
  t.regex(calculated.textContent, /12,2345 m³/)
  t.notRegex(calculated.textContent, /596 m³|391 m³/)
  t.is(rejected.querySelectorAll('svg rect[data-mark="volume"]').length, 0)
  t.truthy(rejected.querySelector('button[data-mark="volume"][data-value="0"][data-calendar-mark="period"]'))
  t.regex(rejected.textContent, /Volume rejeté calculé/i)
})

test('un premier index et deux index sans calcul ne dessinent aucune zone de volume', t => {
  const value = reading('premier', '2026-06-18', 400)
  const preceding = reading('connu', '2026-05-14', 200)
  for (const history of [[value], [value, preceding]]) {
    const current = chunk(value, {history})
    current.flowType = 'PRELEVEMENT'
    const page = renderQuick([current], {totalWaterVolumeWithdrawn: 0})
    const figure = page.querySelector('figure[aria-label="Index et volumes"]')
    t.is(figure.querySelectorAll('[data-mark="index"]').length, history.length)
    t.is(figure.querySelectorAll('[data-mark="volume"]').length, 0)
    t.is(figure.querySelectorAll('[data-index-link]').length, history.length - 1)
  }
})

test('un volume saisi directement occupe les dates déclarées et ne crée pas d’index', t => {
  const period = {measurementType: 'VOLUME', periodStartDate: '2026-05-14', periodEndDate: '2026-06-18'}
  const declared = {...computedVolume('625'), id: 'volume-déclaré', valueKind: 'DECLARED', periodEnd: '2026-06-19T00:00:00.000Z'}
  const current = {...chunk(declared), flowType: 'PRELEVEMENT', metadata: period}
  const page = renderQuick([current], period)
  const figure = page.querySelector('figure[aria-label="Volumes déclarés"]')
  t.truthy(figure.querySelector('button[data-mark="volume"][data-value="625"]'))
  t.is(figure.querySelectorAll('[data-mark="index"]').length, 0)
  t.regex(figure.textContent, /14\/05\/2026/)
  t.regex(figure.textContent, /18\/06\/2026/)
  t.regex(figure.querySelector('details').textContent, /Volume saisi/i)
})

test('une valeur isolée reste lisible avec sa date ou ses deux bornes de période', t => {
  const day = '2026-04-12'
  const index = reading('index-avril', day, 1500)
  const indexFigure = renderQuick([chunk(index)]).querySelector('figure')
  const indexGroup = indexFigure.querySelector('[data-panel="indexes"] li[data-current="true"]')
  t.regex(indexGroup.textContent, /Index du compteur/)
  t.is(indexGroup.querySelector('time').getAttribute('datetime'), day)
  t.is(indexFigure.querySelectorAll('svg').length, 0)
  t.truthy(indexFigure.querySelector('[data-calendar-mark="reading"]'))
  t.is(indexFigure.querySelector('select option[selected]').getAttribute('value'), 'week')
  t.regex(indexGroup.textContent, /1\s500 m³/)
  t.regex(indexFigure.textContent, /Deux relevés d’index sont nécessaires/)

  for (const end of [day, '2026-04-26']) {
    const period = {measurementType: 'VOLUME', periodStartDate: day, periodEndDate: end}
    const volume = {...computedVolume('0'), valueKind: 'DECLARED'}
    const article = {...chunk(volume), metadata: period, flowType: 'PRELEVEMENT'}
    const figure = renderQuick([article], period).querySelector('figure')
    const group = figure.querySelector('[data-panel="volumes"] li[data-current="true"]')
    t.regex(group.textContent, /Volume saisi/)
    const dates = group.querySelectorAll('time').map(node => node.getAttribute('datetime'))
    t.deepEqual(dates, end === day ? [day] : [day, end])
    t.regex(group.textContent, /0 m³/)
    const bar = figure.querySelector('[data-calendar-mark="period"]')
    const percent = Number(bar.getAttribute('style').match(/(?:^|;)width:([\d.]+)%/)[1])
    t.true(percent > 0 && percent < 75)
    t.is(figure.querySelectorAll('svg').length, 0)
    if (end === day) t.regex(group.textContent, /le 12 avril 2026/)
  }
})

test('un volume saisi et un relevé antérieur restent identifiables sur le même point', t => {
  const period = {measurementType: 'VOLUME', periodStartDate: '2026-10-01', periodEndDate: '2026-10-31'}
  const volume = {...computedVolume('508'), id: 'volume-octobre', valueKind: 'DECLARED',
    periodStart: '2026-10-01T00:00:00.000Z', periodEnd: '2026-11-01T00:00:00.000Z'}
  const previous = reading('septembre', '2026-09-29', 5787)
  const current = {...chunk(volume), metadata: period, flowType: 'PRELEVEMENT',
    quickReadingHistory: {indexes: [previous], volumes: [{...volume, ...period}]}}
  const page = renderQuick([current], period)
  const figure = page.querySelector('#donnees-chunk-volume-octobre figure')
  const entries = figure.querySelectorAll('li')
  t.deepEqual(figure.querySelectorAll('[data-panel]').map(panel => panel.getAttribute('data-panel')), ['indexes', 'volumes'])
  t.deepEqual(entries.map(entry => entry.getAttribute('data-current')), ['false', 'true'])
  t.regex(entries[0].textContent, /Index du compteur/)
  t.regex(entries[0].textContent, /le 29 septembre 2026/)
  t.regex(entries[1].textContent, /Volume saisi/)
  t.regex(entries[1].textContent, /du 1er au 31 octobre 2026/)
  t.is(figure.querySelectorAll('[data-index-link]').length, 0)
  t.is(figure.querySelectorAll('button[data-mark]').length, 2)
  t.is(figure.querySelectorAll('[data-mark="index"]').length, 1)
  t.is(figure.querySelector('[data-mark="index"]').getAttribute('data-day'), '2026-09-29')
  t.is(figure.querySelector('[data-mark="index"]').getAttribute('data-value'), '5787')
  t.is(figure.querySelectorAll('[data-mark="volume"]').length, 1)
  const interval = figure.querySelector('[data-mark="volume"]')
  t.is(interval.getAttribute('data-start'), '2026-10-01')
  t.is(interval.getAttribute('data-end'), '2026-10-31')
  t.is(interval.getAttribute('data-value'), '508')
  t.true(cells(figure).some(row => row.includes('29/09/2026') && row.includes('5 787 m³')))

  const legacy = {...current, quickReadingHistory: undefined, latestIndexReadings: [previous]}
  t.is(renderQuick([legacy], period).querySelectorAll('[data-mark="index"]').length, 0)
})

test('le détail rassemble les mesures du point une seule fois et distingue le reçu de son historique', t => {
  const index = reading('juin', '2026-06-18', 700)
  const previous = reading('mai', '2026-05-14', 680)
  const next = reading('juillet', '2026-07-20', 730)
  const calculated = computedVolume(20)
  const direct = {...computedVolume(0), id: 'volume-avril', valueKind: 'DECLARED',
    periodStartDate: '2026-04-01', periodEndDate: '2026-04-30'}
  const entry = {...chunk(index), flowType: 'PRELEVEMENT', chunkValues: [index, calculated],
    quickReadingHistory: {indexes: [previous, index, next], volumes: [direct, calculated]}}
  const detail = renderQuick([entry]).querySelector('figure details')
  t.is(detail.querySelectorAll('table').length, 1)
  t.deepEqual(cells(detail).filter(row => row.length), [
    ['Volume prélevé calculé', 'Du 14/05/2026 au 18/06/2026', '20 m³'],
    ['Index du compteur', '18/06/2026', '700 m³'],
    ['Index du compteur', '14/05/2026', '680 m³'],
    ['Volume saisi', 'Du 01/04/2026 au 30/04/2026', '0 m³']
  ])
  t.is(detail.querySelectorAll('tbody[aria-label="Historique"] td').length, 6)
  t.notRegex(detail.textContent, /730 m³/)
})

test('le détail garde la période et la valeur de remplacement d’un volume saisi corrigé', t => {
  const period = {measurementType: 'VOLUME', periodStartDate: '2026-04-01', periodEndDate: '2026-04-30'}
  const volume = {...computedVolume(3), valueKind: 'DECLARED', isOverwritten: true, overwrittenBy: {value: 4.5, unit: 'm³'}}
  const entry = {...chunk(volume), metadata: period}
  const detail = renderQuick([entry], period).querySelector('figure details')
  t.is(detail.querySelector('del').textContent, '3 m³')
  t.regex(detail.textContent, /Remplacée par 4,5 m³/)
  t.regex(detail.textContent, /Du 01\/04\/2026 au 30\/04\/2026/)
})

test('la télérelève API générique mixte affiche chaque mesure avec sa nature, son unité et ses deux bornes', t => {
  const index = reading('index-juillet', '2026-07-02', '3000.1234567890123456789012', {unit: 'm3',
    periodStart: '2026-07-02T05:45:00Z', periodEnd: '2026-07-02T06:00:00Z'})
  const volume = {...computedVolume(12), unit: 'm3', periodStart: '2026-07-01T06:00:00Z', periodEnd: '2026-07-02T06:00:00Z',
    isOverwritten: true, overwrittenBy: {value: '12.25', unit: 'm3'}}
  const flow = {...volume, id: 'debit', metricTypeCode: 'débit', valueKind: 'DECLARED', unit: 'L/s', value: '3.2',
    isOverwritten: false, overwrittenBy: null}
  const source = {type: 'API', metadata: {}, chunks: [{...chunk(index), calculationStrategy: 'GENERIC', flowType: 'PRELEVEMENT',
    metadata: {}, chunkValues: [flow, volume, index]}]}
  const page = htmlParser.parse(renderToStaticMarkup(createElement(SourceDataDetails, {source})))
  const article = page.querySelector('#donnees-chunk-index-juillet')
  t.regex(article.textContent, /3 mesures/)
  t.notRegex(article.textContent, /Index connus/)
  t.is(article.querySelectorAll('[data-mark="index"]').length, 1)
  t.is(article.querySelectorAll('[data-mark="volume"]').length, 0)
  t.is(article.querySelector('[data-mark="index"]').getAttribute('data-day'), '2026-07-02T06:00:00.000Z')
  const details = article.querySelector('details')
  t.is(details.querySelector('summary').textContent, 'Détail des données')
  const rows = cells(details)
  t.deepEqual(rows[0], ['Index télérelevé', 'Le 2 juillet 2026 à 8 h', '3 000,1234567890123456789012 m³'])
  t.notRegex(rows[0][1], /7 h 45/)
  t.is(rows[1][0], 'Volume prélevé calculé')
  t.is(rows[1][1], 'Du 1er au 2 juillet 2026 à 8 h')
  t.regex(rows[1][2], /12 m³.*Remplacée par 12,25 m³/)
  t.is(rows[2][0], 'Débit prélevé')
  t.is(rows[2][2], '3,2 L/s')
})

test('les télérelèves conservent les points séparés et les heures lors du passage à l’heure d’hiver', t => {
  const first = reading('avant', '2026-10-25', 100, {periodEnd: '2026-10-25T00:30:00Z'})
  const next = {...first, id: 'après', value: 101.5, periodEnd: '2026-10-25T01:30:00Z'}
  const volume = {...computedVolume(1.5), periodStart: first.periodEnd, periodEnd: next.periodEnd}
  const zero = {...volume, id: 'zéro', value: 0, valueKind: 'DECLARED'}
  const source = {type: 'API', chunks: [
    {...chunk(next), chunkValues: [volume, next, first]},
    {...chunk(zero, {meter: 'B', point: 'sud'}), chunkValues: [zero]}
  ]}
  const page = htmlParser.parse(renderToStaticMarkup(createElement(SourceDataDetails, {source})))
  const [north, south] = page.querySelectorAll('article')
  t.deepEqual(north.querySelectorAll('[data-panel]').map(el => el.getAttribute('data-panel')), ['indexes', 'volumes'])
  const indexes = north.querySelectorAll('button[data-mark="index"]')
  t.is(indexes.length, 2)
  t.true(parseFloat(indexes[0].getAttribute('style').match(/left:([\d.]+)%/)[1])
    < parseFloat(indexes[1].getAttribute('style').match(/left:([\d.]+)%/)[1]))
  t.is(north.querySelectorAll('[data-index-link]').length, 1)
  const bar = north.querySelector('button[data-mark="volume"]')
  t.is(Date.parse(bar.getAttribute('data-end')) - Date.parse(bar.getAttribute('data-start')), 3_600_000)
  t.is(bar.getAttribute('data-kind'), 'computed')
  t.deepEqual(south.querySelectorAll('[data-panel]').map(el => el.getAttribute('data-panel')), ['volumes'])
  t.is(south.querySelector('button[data-kind="direct"]').getAttribute('data-value'), '0')
  t.regex(south.textContent, /0 m³/)
  t.notRegex(south.textContent, /101,5/)
})

test('une télérelève remplacée garde les valeurs du reçu consultables dans le détail', t => {
  const value = computedVolume(38)
  for (const [status, chunkStatus] of [['REJECTED', null], [null, 'REJECTED']]) {
    const source = {type: 'API', globalInstructionStatus: status, chunks: [{...chunk(value), instructionStatus: chunkStatus}]}
    const page = htmlParser.parse(renderToStaticMarkup(createElement(SourceDataDetails, {source})))
    t.regex(page.querySelector('article').textContent, /lot a été remplacé/)
    t.is(page.querySelectorAll('[data-mark]').length, 0)
    t.regex(page.querySelector('details').textContent, /38 m³/)
  }
})

test('une télérelève dense ouvre sur le mois de la dernière mesure et distingue le reçu de la sélection', t => {
  const values = []
  for (const month of [4, 5, 6, 7]) {
    for (const day of [1, 2, 3, 4]) {
      const periodStart = new Date(Date.UTC(2025, month - 1, day - 1, 9)).toISOString()
      const periodEnd = new Date(Date.UTC(2025, month - 1, day, 9)).toISOString()
      values.push(
        {id: 'i' + periodEnd, value: month * 100 + day, metricTypeCode: 'index', valueKind: 'DECLARED', unit: 'm3', periodStart, periodEnd},
        {id: 'v' + periodEnd, value: day, metricTypeCode: 'volume', valueKind: 'COMPUTED', unit: 'm3', periodStart, periodEnd}
      )
    }
  }
  const source = {type: 'API', createdAt: '2025-09-01T08:00:00Z', chunks: [{id: 'point-test', chunkValues: values}]}
  const page = htmlParser.parse(renderToStaticMarkup(createElement(SourceDataDetails, {source})))
  const overview = page.querySelector('[data-telemetry-overview]')
  t.is(overview.querySelector('option[selected]').getAttribute('value'), '2025-07')
  t.deepEqual(overview.querySelectorAll('option').map(option => option.getAttribute('value')), ['', '2025-07', '2025-06', '2025-05', '2025-04'])
  t.is(overview.querySelectorAll('button[data-mark]').length, 8)
  t.regex(overview.textContent, /Dernier index du mois704 m³/)
  t.regex(overview.textContent, /Total des volumes calculés10 m³/)
  t.regex(overview.textContent, /8 mesures sur le graphe/)
  t.is(page.querySelectorAll('details tbody tr').length, 8)
  const scope = page.querySelector('[data-receipt-scope]')
  t.regex(scope.textContent, /Télérelève reçue le 1 septembre 2025.*16 index télérelevés · 16 volumes calculés · du 31 mars 2025 au 4 juillet 2025/)
  t.is(page.querySelector('figure').getAttribute('aria-describedby'), scope.id)
  t.is(page.querySelector('details table').getAttribute('aria-describedby'), scope.id)
  t.notRegex(page.textContent, /Cette télérelève|Cette déclaration|Historique/)
})

test('une saisie rapide remplacée conserve ses propres valeurs dans le reçu sans graphe actif ni historique', t => {
  const index = chunk(reading('relevé', '2026-06-18', 1540), {history: [reading('historique', '2026-05-14', 1500)]})
  index.chunkValues.push(computedVolume(40))
  const period = {measurementType: 'VOLUME', periodStartDate: '2026-06-01', periodEndDate: '2026-06-30'}
  const volume = {...chunk({...computedVolume(70), valueKind: 'DECLARED', overwrittenBy: {value: 75, unit: 'm³'}}), metadata: period,
    quickReadingHistory: {indexes: [reading('antérieur', '2026-05-14', 1500)], volumes: [computedVolume(900)]}}
  for (const sourceStatus of [{}, {globalInstructionStatus: 'REJECTED'}, {status: 'REJECTED'}]) {
    for (const entry of [index, volume]) {
      const source = {...sourceStatus, type: 'DECLARATION', metadata: {manualQuickDeclaration: true, measurementType: entry.metadata.measurementType},
        chunks: [{...entry, instructionStatus: Object.keys(sourceStatus).length ? 'VALIDATED' : 'REJECTED'}]}
      const page = htmlParser.parse(renderToStaticMarkup(createElement(SourceDataDetails, {source})))
      const rows = page.querySelector('tbody[aria-label="Cette déclaration"]')
      t.regex(page.textContent, /Ce lot a été remplacé/)
      t.is(page.querySelectorAll('figure, tbody[aria-label="Historique"]').length, 0)
      if (entry === index) {
        t.is(rows.querySelectorAll('del').length, 2)
        t.true(rows.querySelectorAll('del').some(cell => cell.textContent.replaceAll(/\s/g, '') === '1540m³'))
        t.regex(rows.textContent, /Volume.*calculé.*40 m³/)
      } else {
        t.is(rows.querySelector('del').textContent, '70 m³')
        t.regex(rows.textContent, /01\/06\/2026 au 30\/06\/2026.*Remplacée par 75 m³/)
      }
    }
  }
  const other = chunk(reading('autre', '2026-07-02', 1800))
  const mixed = renderQuick([{...index, instructionStatus: 'REJECTED'}, other])
  t.is(mixed.querySelectorAll('article').length, 2)
  t.regex(mixed.querySelectorAll('article')[1].textContent.replaceAll(/\s/g, ''), /1800m³/)
  t.falsy(mixed.querySelectorAll('article')[0].querySelector('figure'))
})

test('une déclaration rapide intermédiaire conserve sa propre période entre les mesures précédentes et suivantes', t => {
  const prior = reading('mai', '2026-05-20', 600)
  const current = reading('juin', '2026-06-20', 672)
  const next = reading('juillet', '2026-07-20', 700)
  const reported = {...computedVolume(72), periodStart: prior.periodEnd, periodEnd: current.periodEnd}
  const later = {...computedVolume(28), id: 'juillet-calcul', periodStart: current.periodEnd, periodEnd: next.periodEnd}
  const entry = {...chunk(current), chunkValues: [current, reported],
    quickReadingHistory: {indexes: [prior, current], volumes: [reported], following: {indexes: [next], volumes: [later]}}}
  const article = renderQuick([entry]).querySelector('article')
  const sourceGroup = article.querySelector('tbody[aria-label="Cette déclaration"]')
  const nextGroup = article.querySelector('tbody[aria-label="Déclarations suivantes"]')
  t.deepEqual(sourceGroup.querySelectorAll('td:last-child').map(td => td.textContent), ['72 m³', '672 m³'])
  t.deepEqual(nextGroup.querySelectorAll('td:last-child').map(td => td.textContent), ['28 m³', '700 m³'])
  t.regex(article.querySelector('tbody[aria-label="Historique"]').textContent, /600 m³/)
  const scope = article.querySelector('[data-scope-range]')
  t.is(Number(scope.getAttribute('data-start')), Date.parse('2026-05-20'))
  t.is(Number(scope.getAttribute('data-end')), Date.parse('2026-06-20'))
  const indexPanel = article.querySelector('[data-panel="indexes"]')
  const circle = scope => indexPanel.querySelector('[data-scope="' + scope + '"] circle[data-mark="index"]')
  t.true(Number(circle('history').getAttribute('cx')) < Number(circle('current').getAttribute('cx')))
  t.true(Number(circle('current').getAttribute('cx')) < Number(circle('following').getAttribute('cx')))
  t.is(article.querySelectorAll('[data-mark="volume"]').length, 2)
})

test('le mois suivant un volume saisi conserve son index et son volume saisi dans le contexte du point', t => {
  const period = {measurementType: 'VOLUME', periodStartDate: '2026-07-01', periodEndDate: '2026-07-31'}
  const reported = {...computedVolume(123), valueKind: 'DECLARED'}
  const later = {...reported, id: 'août', value: 0, periodStartDate: '2026-08-01', periodEndDate: '2026-08-31'}
  const firstAugust = reading('premier-août', '2026-08-01', 800)
  const entry = {...chunk(reported), metadata: period, quickReadingHistory: {following: {indexes: [firstAugust], volumes: [later]}}}
  const article = renderQuick([entry], period).querySelector('article')
  t.regex(article.querySelector('tbody[aria-label="Cette déclaration"]').textContent, /123 m³/)
  const following = article.querySelector('tbody[aria-label="Déclarations suivantes"]').textContent
  t.regex(following, /Volume saisi.*31\/08\/2026.*0 m³/)
  t.regex(following, /Index du compteur.*01\/08\/2026.*800 m³/)
  const scope = article.querySelector('[data-scope-range]')
  t.is(Number(scope.getAttribute('data-end')), Date.parse('2026-08-01'))
})
