import {useMemo} from 'react'

import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField
} from '@mui/material'

import {
  addPermissionWithDependencies,
  removePermissionWithDependents
} from '@/lib/zone-permissions.js'

export function todayAsInputValue() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

export const AgentIdentityFields = ({
  form,
  updateField,
  includeEmail = true,
  profileDisabled = false
}) => (
  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
    {includeEmail && (
      <TextField
        required
        label='Email'
        type='email'
        value={form.email}
        onChange={event => updateField('email', event.target.value)}
      />
    )}
    <TextField
      required
      disabled={profileDisabled}
      label='Prénom'
      value={form.firstName}
      onChange={event => updateField('firstName', event.target.value)}
    />
    <TextField
      required
      disabled={profileDisabled}
      label='Nom'
      value={form.lastName}
      onChange={event => updateField('lastName', event.target.value)}
    />
    <TextField
      disabled={profileDisabled}
      label='Fonction'
      value={form.jobTitle}
      onChange={event => updateField('jobTitle', event.target.value)}
    />
    <TextField
      disabled={profileDisabled}
      label='Téléphone'
      helperText='10 chiffres, sans espace'
      value={form.phoneNumber}
      onChange={event => updateField('phoneNumber', event.target.value)}
    />
  </div>
)

export const ZoneAccessFields = ({form, updateField}) => (
  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
    <TextField
      required
      InputLabelProps={{shrink: true}}
      label='Date de début'
      type='date'
      value={form.startDate}
      onChange={event => updateField('startDate', event.target.value)}
    />
    <TextField
      InputLabelProps={{shrink: true}}
      label='Date de fin'
      type='date'
      value={form.endDate}
      onChange={event => updateField('endDate', event.target.value)}
    />
  </div>
)

export const PermissionFields = ({catalog, permissions, setPermissions}) => {
  const catalogByCode = useMemo(() => new Map(
    catalog.groups.flatMap(group => group.permissions).map(item => [item.code, item])
  ), [catalog.groups])
  const selected = useMemo(() => new Set(permissions), [permissions])

  const togglePermission = (code, checked) => {
    setPermissions(checked
      ? addPermissionWithDependencies(permissions, code, catalogByCode)
      : removePermissionWithDependents(permissions, code, catalogByCode))
  }

  const toggleGroup = (group, checked) => {
    let next = permissions
    for (const permission of group.permissions) {
      next = checked
        ? addPermissionWithDependencies(next, permission.code, catalogByCode)
        : removePermissionWithDependents(next, permission.code, catalogByCode)
    }

    setPermissions(next)
  }

  return (
    <div className='flex flex-col border-t border-[var(--border-default-grey)]'>
      {catalog.groups.map(group => {
        const codes = group.permissions.map(permission => permission.code)
        const selectedCount = codes.filter(code => selected.has(code)).length
        const checked = codes.length > 0 && selectedCount === codes.length

        return (
          <fieldset
            key={group.code}
            className='m-0 min-w-0 border-0 border-b border-[var(--border-default-grey)] py-4'
          >
            <legend className='sr-only'>{group.label}</legend>
            <FormControlLabel
              className='mb-2'
              sx={{marginLeft: 0}}
              control={(
                <Checkbox
                  checked={checked}
                  indeterminate={selectedCount > 0 && !checked}
                  onChange={event => toggleGroup(group, event.target.checked)}
                />
              )}
              label={<span className='fr-text--sm fr-text--bold'>{group.label}</span>}
            />
            <FormGroup className='grid grid-cols-1 gap-x-6 gap-y-1 pl-2 md:pl-4 lg:grid-cols-2'>
              {group.permissions.map(permission => (
                <FormControlLabel
                  key={permission.code}
                  className='items-start px-1 py-1'
                  sx={{margin: 0}}
                  control={(
                    <Checkbox
                      checked={selected.has(permission.code)}
                      size='small'
                      onChange={event => togglePermission(permission.code, event.target.checked)}
                    />
                  )}
                  label={(
                    <span className='flex flex-col pt-1'>
                      <span className='fr-text--sm fr-mb-0'>{permission.label}</span>
                      <span className='fr-text--xs fr-mb-0 text-[var(--text-mention-grey)]'>
                        {permission.description}
                      </span>
                    </span>
                  )}
                />
              ))}
            </FormGroup>
          </fieldset>
        )
      })}
    </div>
  )
}
