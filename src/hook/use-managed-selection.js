import {
  useCallback, useEffect, useMemo, useState
} from 'react'

/**
 * Resolve the preferred option from a list of options
 * @param {Array} options - Array of option objects with value and label
 * @param {string|number} preferred - Preferred value to select
 * @returns {string} The resolved value
 */
function resolvePreferredOption(options, preferred) {
  if (!options || options.length === 0) {
    return ''
  }

  if (preferred) {
    const normalized = preferred.toString().trim().toLowerCase()
    const match = options.find(option => option.value?.toString().toLowerCase() === normalized)
    if (match) {
      return match.value
    }
  }

  return options[0].value
}

/**
 * Match an option value from a list of options
 * @param {Array} options - Array of option objects with value and label
 * @param {string|number} value - Value to match
 * @returns {string} The matched value or empty string
 */
function matchOptionValue(options, value) {
  if (!value) {
    return ''
  }

  const normalized = value.toString().trim().toLowerCase()
  const match = options.find(option => option.value?.toString().toLowerCase() === normalized)
  return match ? match.value : ''
}

/**
 * Custom hook for managing controlled/uncontrolled select component state
 * Supports synchronization with metadata and provides consistent option handling
 *
 * @param {Object} params - Hook parameters
 * @param {Array} params.options - Array of options (will be used directly, no normalization)
 * @param {string|number} params.defaultValue - Default value to select
 * @param {string|number} params.selectedValue - Controlled value (if provided, makes the hook controlled)
 * @param {Function} params.onChange - Callback when value changes
 * @param {string|number} params.metadataValue - Value from metadata to sync with (only in uncontrolled mode)
 * @param {string|number} params.fallbackDefault - Fallback default if no options match
 * @returns {Object} Object containing currentValue, handleChange, resolvedDefault, and options
 */
export function useManagedSelection({
  options = [],
  defaultValue,
  selectedValue,
  onChange,
  metadataValue,
  fallbackDefault
}) {
  const resolvedDefault = useMemo(
    () => resolvePreferredOption(options, defaultValue ?? fallbackDefault),
    [options, defaultValue, fallbackDefault]
  )

  const isControlled = selectedValue !== undefined && selectedValue !== null
  const [internalValue, setInternalValue] = useState(resolvedDefault)

  // Sync internal value with options changes
  useEffect(() => {
    if (isControlled) {
      return
    }

    setInternalValue(previous => {
      const matched = matchOptionValue(options, previous)
      return matched ?? resolvedDefault
    })
  }, [isControlled, options, resolvedDefault])

  // Sync internal value with metadata changes
  useEffect(() => {
    if (isControlled || !metadataValue) {
      return
    }

    setInternalValue(previous => {
      const matched = matchOptionValue(options, metadataValue)
      if (matched && matched !== previous) {
        return matched
      }

      return previous
    })
  }, [isControlled, metadataValue, options])

  const currentValue = isControlled
    ? matchOptionValue(options, selectedValue) || resolvedDefault
    : internalValue

  const handleChange = useCallback(value => {
    const matched = matchOptionValue(options, value)
    if (!matched) {
      return
    }

    if (!isControlled) {
      setInternalValue(matched)
    }

    onChange?.(matched)
  }, [isControlled, onChange, options])

  return {
    currentValue,
    handleChange,
    resolvedDefault,
    options
  }
}
