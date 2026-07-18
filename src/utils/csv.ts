/**
 * Minimal RFC 4180 CSV reader/writer.
 *
 * A dependency would be overkill for two functions, but the quoting rules are
 * not optional: merchants contain commas, notes contain newlines, and a naive
 * `split(',')` silently shifts every column after the first quoted field.
 */

/** Parse CSV text into rows of raw string cells. Handles quotes, escaped quotes, CRLF and a BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  // Excel writes a UTF-8 BOM; it would otherwise end up inside the first header.
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0

  for (; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char !== '"') field += char
      else if (text[i + 1] === '"') { field += '"'; i++ }  // "" is a literal quote
      else inQuotes = false
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  // A trailing newline leaves nothing pending; anything else is a final row.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Quote a cell only when it needs it. */
export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Serialize rows to CSV text with CRLF line endings. */
export function toCsv(rows: string[][]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
