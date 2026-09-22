// museum.json schema migrations. Only field-level changes live here; room layout is a content
// decision (the classroom was written by hand), so a migrated v1 museum keeps its old rooms.
type Json = Record<string, unknown>

const isObject = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x)

function omit(obj: Json, keys: string[]): Json {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)))
}

function list(raw: Json, key: string): Json[] {
  const value = raw[key]
  if (!Array.isArray(value) || !value.every(isObject)) {
    throw new Error(
      `museum.json "${key}" must be an array of objects, got ${JSON.stringify(value)}`,
    )
  }
  return value
}

/** v1 (museum) → v2 (classroom): gallery moods, corner decor, gilt frames and tour stops are gone. */
function v1ToV2(raw: Json): Json {
  return {
    ...raw,
    version: 2,
    rooms: list(raw, 'rooms').map((r) => omit(r, ['mood', 'decor', 'wallTone'])),
    exhibits: list(raw, 'exhibits').map((e) => {
      const rest = omit(e, ['tourStop'])
      return rest.type === 'image' && rest.frame === 'gilt' ? { ...rest, frame: 'wood' } : rest
    }),
    lesson: { sections: [], steps: [] },
  }
}

export function migrateMuseum(raw: unknown): unknown {
  if (!isObject(raw)) throw new Error('museum.json must be a JSON object')
  if (raw.version === 2) return raw
  if (raw.version === 1) return v1ToV2(raw)
  throw new Error(`unsupported museum.json version ${String(raw.version)}`)
}
