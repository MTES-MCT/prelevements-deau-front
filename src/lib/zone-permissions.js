export function hasZonePermission(zone, permission) {
  return Boolean(zone?.permissions?.includes(permission))
}

export function hasAnyZonePermission(user, permission) {
  if (user?.role === 'ADMIN') {
    return true
  }

  return Boolean(user?.permissions?.includes(permission))
}

export function addPermissionWithDependencies(values, code, catalogByCode) {
  const selected = new Set(values)
  const add = permission => {
    if (selected.has(permission)) {
      return
    }

    selected.add(permission)
    for (const required of catalogByCode.get(permission)?.requires || []) {
      add(required)
    }
  }

  add(code)
  return [...selected]
}

export function removePermissionWithDependents(values, code, catalogByCode) {
  const selected = new Set(values)
  selected.delete(code)

  let changed = true
  while (changed) {
    changed = false

    for (const permission of selected) {
      const requires = catalogByCode.get(permission)?.requires || []
      if (requires.some(required => !selected.has(required))) {
        selected.delete(permission)
        changed = true
      }
    }
  }

  return [...selected]
}
