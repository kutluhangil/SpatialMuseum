import { Text } from '@react-three/drei'
import type { LessonTextDef } from '../schema/museum'
import type { WallArea } from '../classroom/layout'
import { palette } from '../design/tokens'
import { fontUrls, textSizes } from '../design/typography'
import { useBilingual } from '../i18n/localeStore'
import { useBlockHeight } from '../exhibits/useBlockHeight'

// Read from the back half of the room; the spawn seat is ~5 m from the board.
export const BOARD_VIEW_DISTANCE = 5
const PAD = 0.11
// A short stroke of blue marker between the two languages, as a lecturer would draw it.
const DIVIDER = { width: 0.55, height: 0.014 }

/**
 * Lesson notes written on the whiteboard, in both languages: the viewer's language at full size
 * first, the other below a marker stroke with its title at body size. Ink on white keeps the 7:1
 * contrast with no card behind.
 */
export function Whiteboard({ area, note }: { area: WallArea; note: LessonTextDef | null }) {
  const say = useBilingual()
  const [titleH, onTitleSync] = useBlockHeight()
  const [bodyH, onBodySync] = useBlockHeight()
  const [otherTitleH, onOtherTitleSync] = useBlockHeight()
  if (!note) return null
  const size = textSizes(BOARD_VIEW_DISTANCE)
  const width = area.u1 - area.u0 - PAD * 2
  const title = note.title ? say(note.title) : null
  const body = say(note.body)
  const bodyY = title ? -titleH - size.title * 0.2 : 0
  const dividerY = bodyY - bodyH - size.body * 0.6
  const otherTitleY = dividerY - size.body * 0.6
  const otherBodyY = otherTitleY - (title?.secondary ? otherTitleH + size.body * 0.2 : 0)
  const synced = (!title || titleH > 0) && bodyH > 0
  return (
    <group position={[-(area.u1 - area.u0) / 2 + PAD, (area.v1 - area.v0) / 2 - PAD, 0]}>
      {title && (
        <Text
          font={fontUrls.bold}
          fontSize={size.title}
          lineHeight={1.05}
          color={palette.murekkep}
          anchorX="left"
          anchorY="top"
          maxWidth={width}
          onSync={onTitleSync}
        >
          {title.primary}
        </Text>
      )}
      <Text
        font={fontUrls.regular}
        fontSize={size.body}
        lineHeight={1.25}
        color={palette.murekkep}
        anchorX="left"
        anchorY="top"
        position-y={bodyY}
        maxWidth={width}
        onSync={onBodySync}
      >
        {body.primary}
      </Text>
      {/* The second language waits for the first to be measured, so it never lands on top of it. */}
      {synced && (title?.secondary || body.secondary) && (
        <group>
          <mesh position={[DIVIDER.width / 2, dividerY, 0]}>
            <planeGeometry args={[DIVIDER.width, DIVIDER.height]} />
            <meshBasicMaterial color={palette.kalemMavi} />
          </mesh>
          {title?.secondary && (
            <Text
              font={fontUrls.bold}
              fontSize={size.body}
              lineHeight={1.2}
              color={palette.murekkep}
              anchorX="left"
              anchorY="top"
              position-y={otherTitleY}
              maxWidth={width}
              onSync={onOtherTitleSync}
            >
              {title.secondary}
            </Text>
          )}
          {body.secondary && (
            <Text
              font={fontUrls.regular}
              fontSize={size.body}
              lineHeight={1.25}
              color={palette.murekkep}
              anchorX="left"
              anchorY="top"
              position-y={otherBodyY}
              maxWidth={width}
            >
              {body.secondary}
            </Text>
          )}
        </group>
      )}
    </group>
  )
}
