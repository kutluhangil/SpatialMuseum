import { useEffect, useMemo } from 'react'
import type { Museum, RoomDef } from '../schema/museum'
import { wallFrame, wallPoint, wallYaw } from '../scene/wallFrame'
import { classroomLayout } from './layout'
import { Blinds } from './Blinds'
import { RoomControls } from './RoomControls'
import { buildClassroomFurniture, buildContactShadows } from './furniture'
import { boardGhostTexture, softShadowTexture } from '../design/proceduralTextures'
import { quality } from '../xr/device'
import { useText } from '../i18n/localeStore'
import { statsEnabled } from '../ui/desktop/perfStats'
import { XRPerfPanel } from '../ui/XRPerfPanel'
import { lessonView } from '../lesson/lesson'
import { useLessonStore } from '../lesson/lessonStore'
import { Whiteboard } from '../lesson/Whiteboard'
import { ProjectionScreen } from '../lesson/ProjectionScreen'
import { DeskButtons } from '../lesson/DeskButtons'
import { LessonControls } from '../lesson/LessonControls'
import { CLASSROOM } from '../schema/museum'

/** Everything that makes the room a classroom: merged furniture plus the lesson on board and screen. */
export function Classroom({ room, museum }: { room: RoomDef; museum: Museum }) {
  const layout = useMemo(() => classroomLayout(room), [room])
  const furniture = useMemo(() => buildClassroomFurniture(room, layout), [room, layout])
  useEffect(() => () => furniture.dispose(), [furniture])
  const shadows = useMemo(() => buildContactShadows(room, layout), [room, layout])
  useEffect(() => () => shadows.dispose(), [shadows])
  const t = useText()
  const index = useLessonStore((s) => s.index)
  const hasLesson = museum.lesson.steps.length > 0
  const view = hasLesson ? lessonView(museum.lesson, index) : null

  const c = room.classroom
  if (!c) throw new Error(`Classroom rendered for non-classroom room "${room.id}"`)
  const f = wallFrame(room, c.front)
  const yaw = wallYaw(f)
  const b = layout.board
  const s = layout.screen
  // The desk in front of the spawn seat: buttons sit on its far half, towards the board.
  const seat = layout.spawnSeat.position
  const deskTop = CLASSROOM.desk.height
  const toFront = [-f.normal[0], 0, -f.normal[2]] as const
  const buttonsAt: [number, number, number] = [
    seat[0] + toFront[0] * (CLASSROOM.chairBehind - 0.05),
    deskTop + 0.045,
    seat[2] + toFront[2] * (CLASSROOM.chairBehind - 0.05),
  ]

  return (
    <group>
      <mesh geometry={furniture} name={`classroom:${room.id}`}>
        <meshBasicMaterial vertexColors />
      </mesh>
      {/* Grounds every desk and chair: without it the furniture seems to float on the tiles. */}
      <mesh geometry={shadows} renderOrder={1}>
        <meshBasicMaterial
          color="#000000"
          alphaMap={softShadowTexture()}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <Blinds room={room} layout={layout} />
      {statsEnabled && (
        <XRPerfPanel position={[...wallPoint(f, (b.u0 + b.u1) / 2, 0.55, 0.02)]} rotationY={yaw} />
      )}
      <RoomControls room={room} layout={layout} />
      {/* Old ink the eraser never took off: the board reads as used, not as a white rectangle. */}
      {quality.boardGhost && (
        <mesh
          position={wallPoint(f, (b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2, 0.021)}
          rotation-y={yaw}
          renderOrder={1}
        >
          <planeGeometry args={[b.u1 - b.u0 - 0.04, b.v1 - b.v0 - 0.04]} />
          <meshBasicMaterial map={boardGhostTexture()} transparent depthWrite={false} />
        </mesh>
      )}
      {view && (
        <>
          <group
            position={wallPoint(f, (b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2, 0.024)}
            rotation-y={yaw}
          >
            <Whiteboard area={b} note={view.board} />
          </group>
          <group
            position={wallPoint(f, (s.u0 + s.u1) / 2, (s.v0 + s.v1) / 2, s.standoff + 0.004)}
            rotation-y={yaw}
          >
            <ProjectionScreen area={s} content={view.screen} title={t(museum.title)} />
          </group>
          <group position={buttonsAt} rotation-y={yaw}>
            <DeskButtons count={view.count} />
          </group>
          <LessonControls />
        </>
      )}
    </group>
  )
}
