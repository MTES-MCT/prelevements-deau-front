import {format} from 'date-fns'
import {fr} from 'date-fns/locale'

function transformFrenchFirst(day) {
  if (day === 1) {
    return '1er'
  }

  return day
}

function formatDate(date) {
  if (!date) {
    return null
  }

  return format(date, 'dd/MM/yyyy')
}

export function formatPeriodeDate(dateString) {
  if (!dateString) {
    return null
  }

  const date = new Date(dateString)
  const day = date.getDate()

  return `${transformFrenchFirst(day)} ${format(date, 'MMMM', {locale: fr})}`
}

export function formatFullDateFr(dateString) {
  if (!dateString) {
    return null
  }

  const date = new Date(dateString)
  const day = transformFrenchFirst(date.getDate())
  const month = format(date, 'MMMM', {locale: fr})
  const year = format(date, 'yyyy')

  return `${day} ${month} ${year}`
}

export function formatDateRange(start, end) {
  const startFormated = formatFullDateFr(start)
  const endFormated = formatFullDateFr(end)

  if (startFormated && endFormated) {
    return `Du ${startFormated} au ${endFormated}`
  }

  if (startFormated) {
    return `Depuis le ${startFormated}`
  }

  if (endFormated) {
    return `Jusqu’au ${endFormated}`
  }

  return 'Non renseignée'
}

export default formatDate
