export function handleAccessDenied({
  forbiddenOnAccessDenied = true,
  renderForbidden
}) {
  if (forbiddenOnAccessDenied) {
    renderForbidden()
  }

  return {
    success: false,
    error: 'INSUFFICIENT_PERMISSIONS',
    code: 403
  }
}
