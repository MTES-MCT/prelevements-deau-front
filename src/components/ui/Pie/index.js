'use client'

import {PieChart} from '@mui/x-charts'

const Pie = ({data, height, width}) => (
  <PieChart
    series={[
      {
        highlightScope: {faded: 'global', highlighted: 'item'},
        data: [...data],
        arcLabel: item => item.value ?? ''
      }
    ]}
    width={width || 500}
    height={height || 300}
    margin={{right: 150}}
  />
)

export default Pie
