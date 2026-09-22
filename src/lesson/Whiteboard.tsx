import { Text } from '@react-three/drei'
import type { LessonTextDef } from '../schema/museum'
import type { WallArea } from '../classroom/layout'
import { palette } from '../design/tokens'
import { fontUrls, textSizes } from '../design/typography'
import { useText } from '../i18n/localeStore'

// Read from the back half of the room; the spawn seat is ~5 m from the board.
export const BOARD_VIEW_DISTANCE = 5
const PAD = 0.12

/** Lesson notes written on the whiteboard: ink on white keeps the 7:1 contrast with no card behind. */
export function Whiteboard({ area, note }: { area: WallArea; note: LessonTextDef | null }) {
  const t = useText()
  if (!note) return null
  const size = textSizes(BOARD_VIEW_DISTANCE)
  const width = area.u1 - area.u0 - PAD * 2
  return (
    <group position={[-(area.u1 - area.u0) / 2 + PAD, (area.v1 - area.v0) / 2 - PAD, 0]}>
      {note.title && (
        <Text
          font={fontUrls.bold}
          fontSize={size.title}
          color={palette.murekkep}
          anchorX="left"
          anchorY="top"
          maxWidth={width}
        >
          {t(note.title)}
        </Text>
      )}
      <Text
        font={fontUrls.regular}
        fontSize={size.body}
        lineHeight={1.3}
        color={palette.murekkep}
        anchorX="left"
        anchorY="top"
        position-y={note.title ? -size.title * 1.35 : 0}
        maxWidth={width}
      >
        {t(note.body)}
      </Text>
    </group>
  )
}
