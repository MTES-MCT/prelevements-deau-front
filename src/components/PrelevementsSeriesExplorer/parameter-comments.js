/**
 * ParameterComments Component
 *
 * Displays comments associated with selected parameters as discrete info alerts.
 * Each comment shows the parameter label for context.
 *
 * @component
 */

'use client'

import {useMemo} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box} from '@mui/material'

/**
 * Extracts comments from selected parameters
 * @param {Array<string>} selectedParams - Selected parameter labels
 * @param {Map} parameterMap - Map of parameterLabel to parameter metadata
 * @returns {Array<{parameterLabel: string, comment: string}>} Comments with their parameter labels
 */
function extractParameterComments(selectedParams, parameterMap) {
  const comments = []

  for (const paramLabel of selectedParams) {
    const param = parameterMap.get(paramLabel)
    const comment = param?.extras?.commentaire

    if (comment && typeof comment === 'string' && comment.trim()) {
      comments.push({
        parameterLabel: paramLabel,
        comment: comment.trim()
      })
    }
  }

  return comments
}

/**
 * ParameterComments displays info alerts for comments of selected parameters
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.selectedParams - Currently selected parameter labels
 * @param {Map} props.parameterMap - Map of parameterLabel to parameter metadata (including extras)
 * @returns {JSX.Element|null} Alert components for each comment, or null if no comments
 */
const ParameterComments = ({selectedParams, parameterMap}) => {
  const comments = useMemo(
    () => extractParameterComments(selectedParams, parameterMap),
    [selectedParams, parameterMap]
  )

  if (comments.length === 0) {
    return null
  }

  return (
    <Box className='flex flex-col gap-2'>
      {comments.map(({parameterLabel, comment}) => (
        <Alert
          key={parameterLabel}
          small
          severity='info'
          description={
            <span>
              <strong>{parameterLabel}</strong> : {comment}
            </span>
          }
        />
      ))}
    </Box>
  )
}

export default ParameterComments
