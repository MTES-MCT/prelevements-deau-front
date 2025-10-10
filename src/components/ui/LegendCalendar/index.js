const LegendItem = ({color, label}) => (
  <div className='flex items-center gap-2'>
    <span
      style={{
        height: '1em',
        width: '1em',
        backgroundColor: color
      }}
      className='fr-p-1w aspect-square block rounded'
    />
    <span>{label}</span>
  </div>
)

const LegendCalendar = ({labels}) => (
  <div className='flex flex-col sm:flex-row items-center gap-4'>
    {labels.map(item => (
      <LegendItem
        key={item.label}
        color={item.color}
        label={item.label}
      />
    ))}
  </div>
)

export default LegendCalendar
