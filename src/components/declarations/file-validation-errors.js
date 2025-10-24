'use client'

import {useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Button from '@codegouvfr/react-dsfr/Button'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {
  List,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material'
import {Box} from '@mui/system'
import {uniqueId} from 'lodash-es'

import {normalizeString} from '@/utils/string.js'

function extractUniqueCellules(input) {
  const regex = /\b\d+(?:-\d+)?\b/g
  const matches = input.match(regex) || []

  const seen = new Set()
  const uniques = []
  for (const m of matches) {
    if (!seen.has(m)) {
      seen.add(m)
      uniques.push(m)
    }
  }

  return uniques
}

const ErrorToggleButton = ({onClick, isAtMax}) => (
  <Button
    priority='tertiary'
    className='self-end mt-4'
    iconId={isAtMax ? 'fr-icon-subtract-line' : 'fr-icon-add-line'}
    iconPosition='right'
    onClick={onClick}
  >
    {isAtMax ? 'Voir moins' : 'Voir plus'}
  </Button>
)

const FileValidationErrors = ({errors: errorList}) => {
  const [limit, setLimit] = useState(10)

  const errors = errorList.filter(error => !error.severity || error.severity === 'error')
  const warnings = errorList.filter(error => error.severity === 'warning')

  const renderSection = (items, severity) => {
    if (items.length === 0) {
      return null
    }

    const isError = severity === 'error'
    const iconClass = isError ? 'fr-icon-error-fill' : 'fr-icon-alert-fill'
    const color = isError
      ? fr.colors.decisions.text.default.error.default
      : fr.colors.decisions.text.default.warning.default

    const initialLimit = 10
    const isAtMax = isError && limit >= items.length
    const displayItems = isError ? items.slice(0, limit) : items

    const handleToggle = () => {
      if (isAtMax) {
        setLimit(initialLimit)
      } else {
        setLimit(prev => Math.min(prev + 10, items.length))
      }
    }

    return (
      <div className={`flex flex-col ${isError ? '' : 'mt-4'}`}>
        {displayItems.map((item, idx) => {
          const [messageText, cells] = item.message.split('pour les cellule')
          return (
            <Accordion
              key={uniqueId('error-')}
              sx={{
                backgroundColor: idx % 2 === 1 ? fr.colors.decisions.background.alt.grey.default : fr.colors.decisions.background.default.grey.default
              }}
              slotProps={{transition: {unmountOnExit: true}}}
            >
              <AccordionSummary
                expandIcon={<Box component='span' className='fr-icon-arrow-down-s-line' />}
                aria-controls={`${severity}-panel-content`}
                id={`${severity}-panel-header`}
              >
                <Box className='flex gap-2'>
                  <Box
                    component='span'
                    className={iconClass}
                    sx={{color}}
                  />
                  <Typography component='span'>
                    {messageText}
                  </Typography>
                </Box>
              </AccordionSummary>
              {cells ? (
                <AccordionDetails>
                  <Box className='flex flex-wrap gap-1 items-center'>
                    <Typography component='span'>
                      Les cellules suivantes sont concernées :
                    </Typography>
                    {extractUniqueCellules(item.message.split('pour ')[1]).map(cell => (
                      <Tag key={normalizeString(messageText) + cell}>
                        {cell}
                      </Tag>
                    ))}
                  </Box>
                </AccordionDetails>
              ) : (
                <Alert severity='info' description={item.explanation || 'Pas d’autre information disponible.'} />
              )}
            </Accordion>
          )
        })}
        {isError && items.length > initialLimit && (
          <ErrorToggleButton
            isAtMax={isAtMax}
            onClick={handleToggle}
          />
        )}
      </div>
    )
  }

  return (
    <List disablePadding component='div'>
      {renderSection(errors, 'error')}
      {renderSection(warnings, 'warning')}
    </List>
  )
}

export default FileValidationErrors
