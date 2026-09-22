import { useEffect, useMemo } from 'react'
import type { PosterAtlasDef, PosterWallDef, RoomDef } from '../schema/museum'
import { CLASSROOM_LIGHT } from '../design/light'
import { softShadowTexture } from '../design/proceduralTextures'
import { mediaUrl } from '../media/mediaUrl'
import { useKTX2 } from '../media/useKTX2'
import {
  buildPosterFrames,
  buildPosterSheet,
  buildPosterShadows,
  posterSlots,
  type PosterSlot,
} from './posterHang'

/** One atlas: every page it holds, drawn in a single pass. */
function PosterSheet({
  room,
  wall,
  slots,
  atlas,
  index,
}: {
  room: RoomDef
  wall: PosterWallDef
  slots: PosterSlot[]
  atlas: PosterAtlasDef
  index: number
}) {
  const texture = useKTX2(mediaUrl(atlas.src))
  const geometry = useMemo(
    () => buildPosterSheet(room, wall, slots, atlas, index),
    [room, wall, slots, atlas, index],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      {/* Unlit: the pages carry their own ink, the vertex colours carry the room's daylight. */}
      <meshBasicMaterial map={texture} vertexColors toneMapped={false} />
    </mesh>
  )
}

/**
 * The class's own posters hung along one wall. Framed exhibits would cost a draw call and a texture
 * each; here the pages live in KTX2 atlases, so the whole exhibition is three meshes plus one per
 * atlas, whatever the number of pages.
 */
export function PosterWall({ room, wall }: { room: RoomDef; wall: PosterWallDef }) {
  const slots = useMemo(() => posterSlots(wall), [wall])
  const frames = useMemo(
    () => buildPosterFrames(room, wall, slots, CLASSROOM_LIGHT),
    [room, wall, slots],
  )
  const shadows = useMemo(() => buildPosterShadows(room, wall, slots), [room, wall, slots])
  useEffect(
    () => () => {
      frames.dispose()
      shadows.dispose()
    },
    [frames, shadows],
  )
  return (
    <group name={`posters:${room.id}`}>
      <mesh geometry={shadows} renderOrder={1}>
        <meshBasicMaterial
          color="#000000"
          alphaMap={softShadowTexture()}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={frames}>
        <meshBasicMaterial vertexColors />
      </mesh>
      {wall.atlases.map((atlas, index) => (
        <PosterSheet
          key={atlas.src}
          room={room}
          wall={wall}
          slots={slots}
          atlas={atlas}
          index={index}
        />
      ))}
    </group>
  )
}
