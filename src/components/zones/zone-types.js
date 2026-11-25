import {ZONE_ICONS} from './zone-icons.js'

export const zoneTypeFilterOptions = [
  {
    checkboxClassName: 'accent-[#000091]',
    className: 'border-[#000091] bg-[#eeeeff] text-[#000091]',
    colorClassName: 'text-[#000091]',
    iconClassName: ZONE_ICONS.mapPin2,
    label: 'Région',
    value: 'REGION'
  },
  {
    checkboxClassName: 'accent-[#18753c]',
    className: 'border-[#18753c] bg-[#e6f4ea] text-[#18753c]',
    colorClassName: 'text-[#18753c]',
    iconClassName: ZONE_ICONS.mapPin,
    label: 'Département',
    value: 'DEPARTEMENT'
  },
  {
    checkboxClassName: 'accent-[#8d533e]',
    className: 'border-[#8d533e] bg-[#fff4f0] text-[#8d533e]',
    colorClassName: 'text-[#8d533e]',
    iconClassName: ZONE_ICONS.water,
    label: 'SAGE',
    value: 'SAGE'
  },
  {
    checkboxClassName: 'accent-[var(--text-label-purple-glycine)]',
    className: 'border-[var(--border-default-purple-glycine)] bg-[var(--background-contrast-purple-glycine)] text-[var(--text-label-purple-glycine)]',
    colorClassName: 'text-[var(--text-label-purple-glycine)]',
    iconClassName: ZONE_ICONS.mapPin2,
    label: 'PTGE',
    value: 'PTGE'
  }
]
export const zoneTypePresentations = Object.fromEntries(zoneTypeFilterOptions.map(option => [option.value, option]))
