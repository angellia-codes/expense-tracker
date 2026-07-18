/**
 * Self-check for the CSV parser. No test runner installed, so this is a plain
 * assert script:
 *
 *   node --experimental-strip-types scripts/csv.check.ts
 */
import assert from 'node:assert/strict'
import { parseCsv, toCsv } from '../src/utils/csv.ts'

// Plain rows
assert.deepEqual(parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']])

// Trailing newline must not produce a phantom row
assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']])

// A comma inside quotes is data, not a delimiter
assert.deepEqual(parseCsv('a,"b,c",d'), [['a', 'b,c', 'd']])

// "" is an escaped quote
assert.deepEqual(parseCsv('"say ""hi""",x'), [['say "hi"', 'x']])

// Newlines survive inside quoted fields
assert.deepEqual(parseCsv('"line1\nline2",x'), [['line1\nline2', 'x']])

// A BOM belongs to the encoding, not the first header
assert.deepEqual(parseCsv('﻿Date,Amount\n2026-01-01,5'), [['Date', 'Amount'], ['2026-01-01', '5']])

// Empty trailing cells are preserved
assert.deepEqual(parseCsv('a,,c'), [['a', '', 'c']])

// Round-trip: anything we write, we can read back
const rows = [['Date', 'Notes'], ['2026-01-01', 'has "quotes", a comma\nand a newline']]
assert.deepEqual(parseCsv(toCsv(rows)), rows)

console.log('csv: all checks passed')
