import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { MuseumSchema } from '../src/schema/museum.ts'
import { migrateMuseum } from '../src/schema/migrate.ts'

const file = process.argv[2] ?? 'content/museum.json'

let raw: unknown
try {
  raw = JSON.parse(readFileSync(file, 'utf8'))
} catch (err) {
  console.error(`${file}: cannot read or parse JSON\n${String(err)}`)
  process.exit(1)
}

const result = MuseumSchema.safeParse(migrateMuseum(raw))
if (!result.success) {
  console.error(
    `${file}: ${result.error.issues.length} problem(s)\n${z.prettifyError(result.error)}`,
  )
  process.exit(1)
}

const m = result.data
console.log(`${file}: ok — ${m.rooms.length} rooms, ${m.exhibits.length} exhibits`)
