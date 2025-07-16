import {format} from 'date-fns'
import {fr} from 'date-fns/locale'

function formatDate(date) {
  if (!date) {
    return null
  }

  return format(date, 'dd/MM/yyyy')
}

export function formatFullDateFr(dateString) {
  if (!dateString) {
    return null
  }

  const date = new Date(dateString)
  const dayNum = date.getDate()
  const day = dayNum === 1 ? '1er' : String(dayNum).padStart(2, '0')
  const month = format(date, 'MMMM', {locale: fr})

  const year = date.getFullYear()
  if (year === 1) {
    return `${day} ${month}`
  }

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

export function isOver(dateFin) {
  if (!dateFin) {
    return false
  }

  const today = new Date()
  const dateFinObj = new Date(dateFin)

  return dateFinObj < today
}

export default formatDate

