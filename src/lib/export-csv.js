function jsonToCsv(jsonData) {
  const csvRows = []

  const headers = getHeaders(jsonData)
  csvRows.push(headers.join(','))

  for (const row of jsonData) {
    const values = headers.map(header => {
      const value = getValueByPath(row, header)
      const escaped = (value !== null && value !== undefined) ? value.toString().replaceAll('"', '""') : ''
      return `"${escaped}"`
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

function getHeaders(jsonData) {
  const headers = new Set()
  for (const item of jsonData) {
    extractHeaders(item, '', headers)
  }

  return [...headers]
}

function extractHeaders(item, prefix, headers) {
  for (const key in item) {
    if (Object.hasOwn(item, (key))) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof item[key] === 'object' && item[key] !== null) {
        extractHeaders(item[key], fullKey, headers)
      } else {
        headers.add(fullKey)
      }
    }
  }
}

function getValueByPath(obj, path) {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current && current[part] !== 'undefined') {
      current = current[part]
    } else {
      return undefined
    }
  }

  return current
}

export function createCsvBlob(content) {
  // Excel needs the UTF-8 BOM in the file itself. Response.text() strips it.
  const csvContent = content.startsWith('\uFEFF') ? content : `\uFEFF${content}`
  return new Blob([csvContent], {type: 'text/csv;charset=utf-8;'})
}

export function downloadCsv(data, filename) {
  const blob = createCsvBlob(jsonToCsv(data))
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.append(link)
  link.click()
  link.remove()
}
