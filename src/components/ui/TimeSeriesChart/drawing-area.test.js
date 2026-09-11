import test from 'ava'

import {isPointInDrawingArea} from './drawing-area.js'

test('les annotations utilisent les dimensions publiques MUI 9, y compris aux bords du graphique', t => {
  const area = {
    left: 80, top: 48, width: 640, height: 280
  }
  t.true(isPointInDrawingArea({x: 400, y: 100}, area))
  t.true(isPointInDrawingArea({x: 80, y: 48}, area))
  t.true(isPointInDrawingArea({x: 720, y: 328}, area))
  for (const point of [{x: 79, y: 100}, {x: 721, y: 100}, {x: 400, y: 47}, {x: 400, y: 329}, {x: Number.NaN, y: 100}]) {
    t.false(isPointInDrawingArea(point, area))
  }
})
