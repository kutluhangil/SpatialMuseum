import { palette } from './tokens'

/** Baked light of a room: colour and strength folded into vertex colours at build time. */
export type RoomLight = {
  /** Colour of the room's light, blended into walls and ceiling. */
  light: string
  /** How strongly that colour tints the surfaces (0 = none). */
  tint: number
  /** Overall brightness of walls and ceiling. */
  exposure: number
  /** Strength of the sunlight through the windows, on surfaces facing it (0 = overcast). */
  sun: number
}

// University classrooms are lit flat and bright by ceiling LED panels, slightly cool.
export const CLASSROOM_LIGHT: RoomLight = {
  light: palette.ledIsik,
  tint: 0.05,
  exposure: 1,
  sun: 0.75,
}
