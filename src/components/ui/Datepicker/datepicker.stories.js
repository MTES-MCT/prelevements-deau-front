import DatePicker from './index.js'

const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'object',
      description: 'Tableau de plages { start: Date, end: Date }.'
    },
    hint: {
      control: 'text',
      description: 'Texte d’aide affiché au-dessus du sélecteur.'
    },
    maxSelection: {
      control: 'number',
      description: 'Nombre maximum de plages sélectionnables.'
    }
  },
  args: {
    value: [
      {start: new Date(2025, 0, 1), end: new Date(2025, 0, 31)}
    ],
    hint: 'Sélectionnez une ou plusieurs plages.',
    maxSelection: 3
  }
}

const renderDatePicker = args => (
  <div style={{minHeight: '600px'}}>
    <DatePicker {...args} onConfirm={() => {}} />
  </div>
)

export default meta

export const Default = {render: renderDatePicker}

export const WithHint = {
  args: {hint: 'Vous pouvez choisir jusqu’à 3 périodes.'},
  render: renderDatePicker
}

export const MaxSelectionOne = {
  args: {maxSelection: 1},
  render: renderDatePicker
}

export const WithoutInitialValue = {
  args: {value: null}
}
