function getBadgeClass(status) {
  switch (status) {
    case 'ACTIVE': {
      return 'fr-badge--success'
    }

    case 'DELETED':
    case 'REVOKED': {
      return 'fr-badge--error'
    }

    case 'INACTIVE':
    case 'EXPIRED':
    case 'ENDED': {
      return 'fr-badge--warning'
    }

    case 'FUTURE': {
      return 'fr-badge--info'
    }

    default: {
      return 'fr-badge--info'
    }
  }
}

const ServiceAccountStatusBadge = ({status, label, size = 'sm'}) => (
  <span className={`fr-badge fr-badge--${size} ${getBadgeClass(status)}`}>
    {label || status}
  </span>
)

export default ServiceAccountStatusBadge
