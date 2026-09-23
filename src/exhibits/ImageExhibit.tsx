import type { ExhibitDef } from '../schema/museum'
import { palette } from '../design/tokens'
import { mediaUrl } from '../media/mediaUrl'
import { useKTX2 } from '../media/useKTX2'

type ImageDef = Extract<ExhibitDef, { type: 'image' }>

const FLAT_BORDER = { none: 0, thin: 0.03, passepartout: 0.12 } as const

export function ImageExhibit({ exhibit }: { exhibit: ImageDef }) {
  if (!exhibit.src.endsWith('.ktx2')) {
    // Paintings must be GPU-compressed (PLAN §11 texture budget); scripts/lib/ktx2.ts makes them.
    throw new Error(`image exhibit "${exhibit.id}" src "${exhibit.src}" is not a .ktx2 file`)
  }
  const texture = useKTX2(mediaUrl(exhibit.src))
  const width = exhibit.placement.width
  const height = width / exhibit.aspect
  const frame = exhibit.frame
  return (
    <group>
      {/* Moulded frames are drawn by the room, merged with the others (ExhibitFrames). */}
      {frame !== 'wood' && frame !== 'black' && FLAT_BORDER[frame] > 0 && (
        <mesh position-z={-0.004}>
          <planeGeometry args={[width + FLAT_BORDER[frame] * 2, height + FLAT_BORDER[frame] * 2]} />
          <meshBasicMaterial color={frame === 'passepartout' ? palette.onsut : palette.murekkep} />
        </mesh>
      )}
      <mesh>
        <planeGeometry args={[width, height]} />
        {/* Unlit so the painting keeps its true colours; the wall's light pool does the "lighting". */}
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}
