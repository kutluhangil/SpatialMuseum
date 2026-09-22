import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { Museum as MuseumDef } from '../schema/museum'
import { Exhibit } from '../exhibits/Exhibit'
import { loadedRoomIds, roomAt, useMuseumStore } from '../store/museumStore'
import { Room } from './Room'
import { Panorama } from './Panorama'
import { boxSegments, museumSegments } from '../locomotion/collision'
import { Classroom } from '../classroom/Classroom'
import { classroomLayout } from '../classroom/layout'
import { usePlayerStore } from '../locomotion/playerStore'

const head = new Vector3()

/** Tracks which room the viewer's head is in; outside every room (e.g. mid-doorway) keeps the last. */
function RoomTracker({ museum }: { museum: MuseumDef }) {
  useFrame(({ camera }) => {
    camera.getWorldPosition(head)
    const room = roomAt(museum, head.x, head.z)
    const { currentRoomId, setCurrentRoom } = useMuseumStore.getState()
    if (room && room.id !== currentRoomId) setCurrentRoom(room.id)
  })
  return null
}

export function Museum({ museum }: { museum: MuseumDef }) {
  const exhibitsByRoom = useMemo(() => {
    const map = new Map<string, MuseumDef['exhibits']>()
    for (const e of museum.exhibits) map.set(e.roomId, [...(map.get(e.roomId) ?? []), e])
    return map
  }, [museum])

  useEffect(() => {
    const furniture = museum.rooms
      .filter((r) => r.classroom)
      .flatMap((r) => classroomLayout(r).footprints)
      .flatMap((f) => boxSegments(f.cx, f.cz, f.halfX, f.halfZ))
    usePlayerStore.getState().setColliders(museumSegments(museum, furniture))
    return () => usePlayerStore.getState().setColliders([])
  }, [museum])

  const currentRoomId = useMuseumStore((s) => s.currentRoomId)
  // Multi-room content still streams: rooms within two doors are mounted, direct neighbours in full detail.
  const loaded = useMemo(() => loadedRoomIds(museum, currentRoomId), [museum, currentRoomId])
  const near = useMemo(() => loadedRoomIds(museum, currentRoomId, 1), [museum, currentRoomId])
  const rooms = museum.rooms.filter((r) => loaded.has(r.id))
  const hasWindows = museum.rooms.some((r) => r.windows.length > 0)

  return (
    <group>
      <RoomTracker museum={museum} />
      {hasWindows && <Panorama museum={museum} />}
      {rooms.map((room) => {
        const exhibits = exhibitsByRoom.get(room.id) ?? []
        return (
          <group key={room.id}>
            <Room room={room} exhibits={exhibits} />
            {room.classroom && <Classroom room={room} museum={museum} />}
            {exhibits.map((e) => (
              <Exhibit
                key={e.id}
                exhibit={e}
                room={room}
                detail={near.has(room.id) ? 'full' : 'far'}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}
