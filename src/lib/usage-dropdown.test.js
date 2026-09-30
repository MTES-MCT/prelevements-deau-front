import test from 'ava'

import {usageDropdownPosition} from './usage-dropdown.js'

test('le menu garde la largeur du champ et s’ouvre au-dessus près du bas', t => {
  const position = usageDropdownPosition({left: 100, top: 650, bottom: 698, width: 450}, {width: 1024, height: 768})
  t.is(position.width, '450px')
  t.is(position.left, '100px')
  t.true(Number.parseInt(position.top, 10) < 650)
  t.true(Number.parseInt(position.top, 10) + Number.parseInt(position.maxHeight, 10) < 650)
})

test('le menu reste dans le viewport mobile avec clavier, zoom ou champ hors écran', t => {
  const viewport = {width: 320, height: 250, offsetLeft: 12, offsetTop: 80}
  for (const rect of [{left: 4, top: 220, bottom: 268, width: 400}, {left: 4, top: -1000, bottom: -952, width: 400}, {left: 500, top: 1200, bottom: 1248, width: 400}]) {
    const position = Object.fromEntries(Object.entries(usageDropdownPosition(rect, viewport)).map(([key, value]) => [key, Number.parseInt(value, 10)]))
    t.true(position.left >= 20)
    t.true(position.left + position.width <= 324)
    t.true(position.top >= 92)
    t.true(position.top + position.maxHeight <= 318)
    t.true(position.maxHeight > 0)
  }
})
