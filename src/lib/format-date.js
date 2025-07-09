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

export function isOver(dateFin) {
  if (!dateFin) {
    return false
  }

  const today = new Date()
  const dateFinObj = new Date(dateFin)

  return dateFinObj < today
}

export default formatDate

