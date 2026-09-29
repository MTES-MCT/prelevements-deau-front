import test from 'ava'
import {ESLint} from 'eslint'

const eslint = new ESLint()
const fixtures = [
  ['no-undef', 'export const Component = () => <MissingComponent />'],
  ['no-unused-vars', 'const unused = 1'],
  ['react-x/no-missing-key', 'export const Component = ({items}) => items.map(item => <span>{item}</span>)'],
  ['react-x/no-direct-mutation-state', "import {Component} from 'react'\nexport class Example extends Component { render() { this.state.value = 1; return null } }"],
  ['react-dom/no-unknown-property', "export const Component = () => <div unknownProp='value' />"],
  ['react-hooks/rules-of-hooks', "import {useState} from 'react'\nexport const Component = ({active}) => { if (active) useState(0); return null }"],
  ['react-hooks/exhaustive-deps', "import {useEffect} from 'react'\nexport const Component = ({value}) => { useEffect(() => console.log(value), []); return null }"]
]

for (const [rule, code] of fixtures) {
  test(`le lint bloque ${rule}`, async t => {
    const [result] = await eslint.lintText(code, {filePath: 'src/lint-fixture.jsx'})
    t.true(result.messages.some(message => message.ruleId === rule && message.severity === 2))
  })
}

test('le lint comprend les références JSX sans ancien plugin React ni override de peers', async t => {
  const [result] = await eslint.lintText("import {Button} from '@codegouvfr/react-dsfr/Button'\nexport const Component = () => <Button>Continuer</Button>\n", {filePath: 'src/lint-fixture.jsx'})
  t.deepEqual(result.messages, [])
})
