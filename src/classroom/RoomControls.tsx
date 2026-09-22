import type { ThreeEvent } from '@react-three/fiber'
import type { RoomDef } from '../schema/museum'
import { wallFrame, wallPoint, wallYaw } from '../scene/wallFrame'
import { useAudioStore } from '../audio/audioStore'
import type { ClassroomLayout, WallSpot } from './layout'
import { useRoomStore } from './roomStore'

// Invisible boxes the size of a hand's reach: the switch plate and each blind's bead chain. They
// are generous on purpose, as a wall plate is a small target both on a screen and in a headset.
const SWITCH_TARGET = { width: 0.18, height: 0.18, depth: 0.08 }
const CHAIN_TARGET = { width: 0.12, height: 0.9, depth: 0.1 }

function Target({
  position,
  yaw,
  size,
  label,
  onSelect,
}: {
  position: readonly [number, number, number]
  yaw: number
  size: { width: number; height: number; depth: number }
  label: string
  onSelect: () => void
}) {
  const click = useAudioStore((s) => s.click)
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    click()
    onSelect()
  }
  return (
    <mesh position={[...position]} rotation-y={yaw} name={label} onClick={handle}>
      <boxGeometry args={[size.width, size.height, size.depth]} />
      {/* Hit target only: it must still be raycast, so it cannot simply be invisible. */}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/** Lets the student work the room: the light switch by the door and the blind chains. */
export function RoomControls({ room, layout }: { room: RoomDef; layout: ClassroomLayout }) {
  const toggleLights = useRoomStore((s) => s.toggleLights)
  const toggleBlinds = useRoomStore((s) => s.toggleBlinds)
  const spotAt = (spot: WallSpot, depth: number) => {
    const f = wallFrame(room, spot.wall)
    return { position: wallPoint(f, spot.u, spot.v, depth), yaw: wallYaw(f) }
  }
  return (
    <group>
      {layout.switches.map((sw) => {
        const { position, yaw } = spotAt(sw, SWITCH_TARGET.depth / 2)
        return (
          <Target
            key={`switch:${sw.wall}:${sw.u}`}
            position={position}
            yaw={yaw}
            size={SWITCH_TARGET}
            label="light-switch"
            onSelect={toggleLights}
          />
        )
      })}
      {layout.blinds.map((bl) => {
        const chainU = bl.u + (bl.width - 0.02) / 2 - 0.03
        const middle = (bl.top - 0.08 + (bl.bottom - 0.45)) / 2
        const { position, yaw } = spotAt({ wall: bl.wall, u: chainU, v: middle }, -0.028)
        return (
          <Target
            key={`blind:${bl.wall}:${bl.u}`}
            position={position}
            yaw={yaw}
            size={CHAIN_TARGET}
            label="blind-chain"
            onSelect={toggleBlinds}
          />
        )
      })}
    </group>
  )
}
