const Icon = ({iconId, iconElement: IconElement, className = '', ...props}) => {
  if (iconId) {
    return <span className={`${iconId} ${className}`.trim()} {...props} />
  }

  if (IconElement) {
    return <IconElement className={className} {...props} />
  }

  console.error('Icon: `iconId` or `iconElement` is required.')
  return null
}

export default Icon
