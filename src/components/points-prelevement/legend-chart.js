const LegendChart = ({series}) => (
  <div className='flex flex-wrap justify-center gap-2 fr-my-3w'>
    {series.map(serie => (
      <div
        key={serie.label}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: '1em',
          marginBottom: '0.5em'
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            backgroundColor: serie.color,
            marginRight: 5
          }}
        />
        <span>{serie.label}</span>
      </div>
    ))}
  </div>
)

export default LegendChart
