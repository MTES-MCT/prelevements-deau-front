const ENVIRONMENT_LABELS = {
  dev: 'DEV',
  development: 'DEV',
  local: 'DEV',
  test: 'TESTING',
  testing: 'TESTING'
}

function getEnvironmentLabel() {
  const configuredEnvironment = process.env.NEXT_PUBLIC_DEPLOY_ENV?.trim().toLowerCase()
  const environment = configuredEnvironment || (process.env.NODE_ENV === 'development' ? 'development' : '')

  return ENVIRONMENT_LABELS[environment] ?? null
}

const EnvironmentBanner = () => {
  const label = getEnvironmentLabel()

  if (!label) {
    return null
  }

  return (
    <div className='environment-banner' aria-label={`Environnement ${label}`}>
      {label}
    </div>
  )
}

export default EnvironmentBanner
