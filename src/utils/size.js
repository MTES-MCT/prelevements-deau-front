const units = ['octets', 'Ko', 'Mo', 'Go']

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) {
    return '0 octets'
  }

  let i = Number.parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)

  if (i >= units.length) {
    i = units.length - 1
  }

  if (i === 0) {
    return `${bytes} ${units[i]}`
  }

  return `${(bytes / (1024 ** i)).toFixed(1)} ${units[i]}`
}
