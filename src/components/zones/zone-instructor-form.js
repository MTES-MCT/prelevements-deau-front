'use client'

import {useEffect, useMemo, useState} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Button} from '@codegouvfr/react-dsfr/Button'
import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'

import SectionCard from '@/components/ui/SectionCard/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'
import {
  getInstructorName,
  pluralize
} from '@/lib/zone-instructors.js'
import {
  addPermissionWithDependencies,
  removePermissionWithDependents
} from '@/lib/zone-permissions.js'
import {
  addZoneInstructorAction,
  getZoneInstructorOptionsAction,
  updateZoneInstructorAction
} from '@/server/actions/zones.js'

function todayAsInputValue() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

function dateToInputValue(value) {
  if (!value) {
    return ''
  }

  return String(value).slice(0, 10)
}

function getInitialForm(instructor, defaultPermissions) {
  return {
    email: instructor?.email || '',
    firstName: instructor?.firstName || '',
    lastName: instructor?.lastName || '',
    phoneNumber: instructor?.phoneNumber || '',
    jobTitle: instructor?.jobTitle || '',
    permissions: instructor ? (instructor.permissions || []) : defaultPermissions,
    startDate: dateToInputValue(instructor?.startDate) || todayAsInputValue(),
    endDate: dateToInputValue(instructor?.endDate),
    notifyAccountCreation: false,
    notifyZoneAttachment: false
  }
}

function getOptionLabel(instructor) {
  if (!instructor) {
    return ''
  }

  const name = getInstructorName(instructor)
  return instructor.email && instructor.email !== name ? `${name} - ${instructor.email}` : name
}

const InstructorIdentitySummary = ({instructor}) => {
  if (!instructor) {
    return null
  }

  return (
    <Box className='fr-background-alt--grey fr-p-3w flex flex-col gap-1'>
      <Typography variant='subtitle2'>{getInstructorName(instructor)}</Typography>
      {instructor.email && <p className='fr-text--sm fr-mb-0'>{instructor.email}</p>}
      {instructor.jobTitle && <p className='fr-text--sm fr-mb-0'>{instructor.jobTitle}</p>}
      {instructor.phoneNumber && <p className='fr-text--sm fr-mb-0'>{instructor.phoneNumber}</p>}
    </Box>
  )
}

const FormSection = ({title, children}) => (
  <Box className='flex flex-col gap-3'>
    <p className='fr-text--sm fr-text--bold fr-mb-0'>{title}</p>
    {children}
  </Box>
)

const ExistingInstructorSearch = ({
  zone,
  selectedInstructor,
  setSelectedInstructor
}) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const [options, setOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false

    setIsLoading(true)
    setError(null)

    const loadOptions = async () => {
      try {
        const result = await getZoneInstructorOptionsAction(zone.id, {
          search: debouncedSearch,
          limit: 30
        })

        if (ignore) {
          return
        }

        if (!result.success) {
          setError(result.error || 'Impossible de charger les agents existants.')
          setOptions([])
          setIsLoading(false)
          return
        }

        setOptions(result.data || [])
        setIsLoading(false)
      } catch (error) {
        if (!ignore) {
          setError(error.message || 'Impossible de charger les agents existants.')
          setOptions([])
          setIsLoading(false)
        }
      }
    }

    loadOptions()

    return () => {
      ignore = true
    }
  }, [zone.id, debouncedSearch])

  return (
    <Box className='flex flex-col gap-3'>
      <Autocomplete
        fullWidth
        filterOptions={items => items}
        getOptionDisabled={option => option.isAttachedToCurrentZone}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={isLoading}
        loadingText='Recherche en cours...'
        noOptionsText='Aucun agent trouvé'
        options={options}
        value={selectedInstructor}
        renderInput={params => (
          <TextField
            {...params}
            label='Rechercher un agent'
            placeholder='Nom, email ou fonction'
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading && <CircularProgress color='inherit' size={18} />}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props}>
            <Box className='w-full flex flex-col gap-1 py-1'>
              <Box className='flex flex-wrap gap-2 items-center justify-between'>
                <span>{getInstructorName(option)}</span>
                <Box className='flex flex-wrap gap-1'>
                  {option.isAttachedToCurrentZone && (
                    <Chip label='Déjà rattaché' size='small' color='success' />
                  )}
                  {(option.habilitations?.length || 0) > 0 && (
                    <Chip
                      label={pluralize(option.habilitations.length, 'zone')}
                      size='small'
                      variant='outlined'
                    />
                  )}
                </Box>
              </Box>
              <span className='fr-text--xs fr-mb-0'>{option.email}</span>
              {option.jobTitle && <span className='fr-text--xs fr-mb-0'>{option.jobTitle}</span>}
            </Box>
          </li>
        )}
        onChange={(_event, value) => setSelectedInstructor(value)}
        onInputChange={(_event, value, reason) => {
          if (reason !== 'reset') {
            setSearch(value)
          }
        }}
      />

      {error && <Alert severity='error'>{error}</Alert>}

      {selectedInstructor?.isAttachedToCurrentZone && (
        <Alert severity='info'>
          Cet agent est déjà rattaché à cette zone. Ouvrez sa fiche pour mettre à jour ses droits.
        </Alert>
      )}
    </Box>
  )
}

const ZoneAccessFields = ({form, updateField}) => (
  <FormSection title='Accès à cette zone'>
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <TextField
        required
        label='Date de début'
        type='date'
        value={form.startDate}
        InputLabelProps={{
          shrink: true
        }}
        onChange={event => updateField('startDate', event.target.value)}
      />

      <TextField
        label='Date de fin'
        type='date'
        value={form.endDate}
        InputLabelProps={{
          shrink: true
        }}
        onChange={event => updateField('endDate', event.target.value)}
      />
    </div>

  </FormSection>
)

const PermissionFields = ({
  catalog,
  grantablePermissions,
  permissions,
  setPermissions
}) => {
  const catalogByCode = useMemo(() => new Map(
    catalog.groups.flatMap(group => group.permissions).map(item => [item.code, item])
  ), [catalog.groups])
  const grantable = useMemo(() => new Set(grantablePermissions), [grantablePermissions])
  const selected = useMemo(() => new Set(permissions), [permissions])

  const togglePermission = (code, checked) => {
    const next = checked
      ? addPermissionWithDependencies(permissions, code, catalogByCode)
      : removePermissionWithDependents(permissions, code, catalogByCode)

    setPermissions(next)
  }

  const toggleGroup = (group, checked) => {
    let next = permissions
    const groupCodes = group.permissions
      .map(item => item.code)
      .filter(code => grantable.has(code))

    if (checked) {
      for (const code of groupCodes) {
        next = addPermissionWithDependencies(next, code, catalogByCode)
      }
    } else {
      for (const code of groupCodes) {
        next = removePermissionWithDependents(next, code, catalogByCode)
      }
    }

    setPermissions(next)
  }

  return (
    <FormSection title='Droits sur cette zone'>
      <p className='fr-text--sm fr-mb-0' style={{color: 'var(--text-mention-grey)'}}>
        Cochez précisément les actions autorisées. Les droits nécessaires à une action sont sélectionnés automatiquement.
      </p>

      <Box className='flex flex-col' sx={{borderTop: '1px solid var(--border-default-grey)'}}>
        {catalog.groups.map(group => {
          const grantableCodes = group.permissions
            .map(item => item.code)
            .filter(code => grantable.has(code))
          const selectedCount = grantableCodes.filter(code => selected.has(code)).length
          const isGroupChecked = grantableCodes.length > 0 && selectedCount === grantableCodes.length

          return (
            <fieldset
              key={group.code}
              className='border-0 py-4 m-0 min-w-0'
              style={{borderBottom: '1px solid var(--border-default-grey)'}}
            >
              <legend className='sr-only'>{group.label}</legend>
              <FormControlLabel
                className='mb-2'
                sx={{marginLeft: 0}}
                control={(
                  <Checkbox
                    checked={isGroupChecked}
                    disabled={grantableCodes.length === 0}
                    indeterminate={selectedCount > 0 && !isGroupChecked}
                    onChange={event => toggleGroup(group, event.target.checked)}
                  />
                )}
                label={<span className='fr-text--sm fr-text--bold'>{group.label}</span>}
              />

              <FormGroup className='grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1 pl-2 md:pl-4'>
                {group.permissions.map(item => {
                  const isChecked = selected.has(item.code)
                  const canGrant = grantable.has(item.code)

                  return (
                    <FormControlLabel
                      key={item.code}
                      className='items-start rounded-sm px-1 py-1'
                      sx={{margin: 0}}
                      control={(
                        <Checkbox
                          checked={isChecked}
                          disabled={!canGrant && !isChecked}
                          size='small'
                          onChange={event => togglePermission(item.code, event.target.checked)}
                        />
                      )}
                      label={(
                        <span className='flex flex-col pt-1'>
                          <span className='fr-text--sm fr-mb-0'>{item.label}</span>
                          <span className='fr-text--xs fr-mb-0' style={{color: 'var(--text-mention-grey)'}}>{item.description}</span>
                          {!canGrant && (
                            <span className='fr-text--xs fr-mb-0' style={{color: 'var(--text-default-warning)'}}>Non délégable avec vos droits actuels</span>
                          )}
                        </span>
                      )}
                    />
                  )
                })}
              </FormGroup>
            </fieldset>
          )
        })}
      </Box>
    </FormSection>
  )
}

const NewInstructorFields = ({form, updateField}) => (
  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
    <TextField
      required
      label='Email'
      type='email'
      value={form.email}
      onChange={event => updateField('email', event.target.value)}
    />

    <TextField
      label='Fonction'
      value={form.jobTitle}
      onChange={event => updateField('jobTitle', event.target.value)}
    />

    <TextField
      required
      label='Prénom'
      value={form.firstName}
      onChange={event => updateField('firstName', event.target.value)}
    />

    <TextField
      required
      label='Nom'
      value={form.lastName}
      onChange={event => updateField('lastName', event.target.value)}
    />

    <TextField
      label='Téléphone'
      value={form.phoneNumber}
      helperText='10 chiffres, sans espace'
      onChange={event => updateField('phoneNumber', event.target.value)}
    />
  </div>
)

const NotificationFields = ({form, updateField, showAccountCreation}) => (
  <FormSection title='Emails'>
    <Box className='flex flex-wrap gap-x-4 gap-y-1'>
      {showAccountCreation && (
        <FormControlLabel
          sx={{margin: 0}}
          control={(
            <Checkbox
              checked={form.notifyAccountCreation}
              onChange={event => updateField('notifyAccountCreation', event.target.checked)}
            />
          )}
          label='Création de compte'
        />
      )}

      <FormControlLabel
        sx={{margin: 0}}
        control={(
          <Checkbox
            checked={form.notifyZoneAttachment}
            onChange={event => updateField('notifyZoneAttachment', event.target.checked)}
          />
        )}
        label='Rattachement à cette zone'
      />
    </Box>
  </FormSection>
)

const ZoneInstructorForm = ({zone, instructor = null, permissionCatalog}) => {
  const router = useRouter()
  const isEditing = Boolean(instructor)

  const [mode, setMode] = useState('existing')
  const [selectedInstructor, setSelectedInstructor] = useState(null)
  const [form, setForm] = useState(() => getInitialForm(
    instructor,
    permissionCatalog.defaults.filter(permission => zone.permissions?.includes(permission))
  ))
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isExistingMode = !isEditing && mode === 'existing'
  const isNewMode = !isEditing && mode === 'new'

  const selectedInstructorIsAlreadyAttached = Boolean(selectedInstructor?.isAttachedToCurrentZone)

  const isDisabled = useMemo(() => {
    if (isSubmitting || !form.startDate || form.permissions.length === 0) {
      return true
    }

    if (isEditing) {
      return false
    }

    if (isExistingMode) {
      return !selectedInstructor || selectedInstructorIsAlreadyAttached
    }

    return !form.email.trim() || !form.firstName.trim() || !form.lastName.trim()
  }, [
    form.email,
    form.firstName,
    form.lastName,
    form.permissions.length,
    form.startDate,
    isEditing,
    isExistingMode,
    isSubmitting,
    selectedInstructor,
    selectedInstructorIsAlreadyAttached
  ])

  const updateField = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: value
    }))
  }

  const buildPayload = () => {
    const zonePayload = {
      permissions: form.permissions,
      startDate: form.startDate,
      endDate: form.endDate || null,
      notifyAccountCreation: false,
      notifyZoneAttachment: form.notifyZoneAttachment
    }

    if (isEditing) {
      return {
        instructorUserId: instructor.id,
        ...zonePayload
      }
    }

    if (isExistingMode) {
      return {
        instructorUserId: selectedInstructor.id,
        ...zonePayload
      }
    }

    return {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      phoneNumber: form.phoneNumber,
      jobTitle: form.jobTitle,
      ...zonePayload,
      notifyAccountCreation: form.notifyAccountCreation
    }
  }

  const handleSubmit = async () => {
    setError(null)

    if (isNewMode && form.phoneNumber && !/^\d{10}$/.test(form.phoneNumber)) {
      setError('Le numéro de téléphone doit contenir 10 chiffres.')
      return
    }

    if (form.endDate && form.startDate > form.endDate) {
      setError('La date de fin doit être postérieure à la date de début.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = buildPayload()
      const result = isEditing
        ? await updateZoneInstructorAction(zone.id, instructor.id, payload)
        : await addZoneInstructorAction(zone.id, payload)

      if (!result.success) {
        setError(result.error || (isEditing ? 'Impossible d’enregistrer ces changements.' : 'Impossible d’ajouter cet agent.'))
        setIsSubmitting(false)
        return
      }

      router.push(`/zones/${zone.id}/agents/${result.data.id}`)
      router.refresh({showProgress: false})
    } catch (error) {
      setError(error.message)
      setIsSubmitting(false)
    }
  }

  return (
    <SectionCard
      title={isEditing ? 'Droits et période' : 'Ajouter un agent'}
      icon={isEditing ? ZONE_ICONS.edit : ZONE_ICONS.addUser}
      editorOnly={false}
    >
      <Box className='flex flex-col gap-6'>
        {error && (
          <Alert severity='error'>{error}</Alert>
        )}

        <FormSection title='Agent'>
          {!isEditing && (
            <ToggleButtonGroup
              exclusive
              color='primary'
              size='small'
              value={mode}
              onChange={(_event, value) => {
                if (value) {
                  setError(null)
                  setMode(value)
                }
              }}
            >
              <ToggleButton value='existing'>Agent existant</ToggleButton>
              <ToggleButton value='new'>Nouvel agent</ToggleButton>
            </ToggleButtonGroup>
          )}

          {isEditing && (
            <InstructorIdentitySummary instructor={instructor} />
          )}

          {isExistingMode && (
            <ExistingInstructorSearch
              selectedInstructor={selectedInstructor}
              setSelectedInstructor={setSelectedInstructor}
              zone={zone}
            />
          )}

          {isNewMode && (
            <NewInstructorFields form={form} updateField={updateField} />
          )}
        </FormSection>

        <ZoneAccessFields form={form} updateField={updateField} />

        <PermissionFields
          catalog={permissionCatalog}
          grantablePermissions={zone.permissions || []}
          permissions={form.permissions}
          setPermissions={permissions => updateField('permissions', permissions)}
        />

        {!isEditing && zone.permissions?.includes('zone.agent.notify') && (
          <NotificationFields
            form={form}
            showAccountCreation={isNewMode}
            updateField={updateField}
          />
        )}

        <Box className='flex justify-end gap-2 flex-wrap'>
          <Button
            priority='secondary'
            linkProps={{
              href: isEditing ? `/zones/${zone.id}/agents/${instructor.id}` : `/zones/${zone.id}/agents`
            }}
          >
            Annuler
          </Button>

          <Button disabled={isDisabled} onClick={handleSubmit}>
            {isSubmitting ? 'Enregistrement...' : (isEditing ? 'Enregistrer' : 'Ajouter à la zone')}
          </Button>
        </Box>
      </Box>
    </SectionCard>
  )
}

export default ZoneInstructorForm
