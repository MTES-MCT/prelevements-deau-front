'use client'

import {ProgressProvider} from '@bprogress/next/app'

const progressOptions = {
  showSpinner: false,
  trickle: true,
  trickleSpeed: 200
}

const NavigationProgressProvider = ({children}) => (
  <ProgressProvider
    disableSameURL
    shallowRouting
    color='#000091'
    delay={120}
    height='3px'
    options={progressOptions}
    startPosition={0.12}
    stopDelay={100}
  >
    {children}
  </ProgressProvider>
)

export default NavigationProgressProvider
