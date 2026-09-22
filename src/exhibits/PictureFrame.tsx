import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, Path, Shape } from 'three'
import { palette } from '../design/tokens'
import { FRAME_PROFILE, type FrameStyle } from './frameSpec'

export type { FrameStyle } from './frameSpec'
const DEPTH = 0.035
const BEVEL = 0.014

/** Rectangle-with-hole extruded with a bevel: a moulded frame in a single geometry. */
function frameGeometry(width: number, height: number, border: number): ExtrudeGeometry {
  const ow = width / 2 + border
  const oh = height / 2 + border
  const shape = new Shape()
  shape.moveTo(-ow, -oh)
  shape.lineTo(ow, -oh)
  shape.lineTo(ow, oh)
  shape.lineTo(-ow, oh)
  shape.closePath()
  const hole = new Path()
  const iw = width / 2
  const ih = height / 2
  hole.moveTo(-iw, -ih)
  hole.lineTo(-iw, ih)
  hole.lineTo(iw, ih)
  hole.lineTo(iw, -ih)
  hole.closePath()
  shape.holes.push(hole)
  return new ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 3,
    curveSegments: 1,
  })
}

/**
 * A lit, moulded frame around a width × height opening. Its drop shadow is drawn by the room
 * (merged with the other frames' shadows into one mesh). Frames are the one surface that uses PBR:
 * a matte print frame still catches a faint environment highlight.
 */
export function PictureFrame({
  width,
  height,
  style,
}: {
  width: number
  height: number
  style: FrameStyle
}) {
  const border = FRAME_PROFILE[style]
  const geometry = useMemo(
    () => frameGeometry(width, height, border - BEVEL),
    [width, height, border],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      <mesh geometry={geometry} position-z={-DEPTH + 0.004}>
        <meshStandardMaterial
          color={style === 'wood' ? palette.ceviz : palette.murekkep}
          metalness={0}
          roughness={style === 'wood' ? 0.55 : 0.35}
        />
      </mesh>
    </group>
  )
}
