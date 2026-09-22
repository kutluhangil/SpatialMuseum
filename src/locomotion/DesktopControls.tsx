import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { Euler, Vector3 } from 'three'
import { eyeHeight, usePlayerStore } from './playerStore'
import { PLAYER_RADIUS, resolveCircle } from './collision'

const WALK_SPEED = 1.6 // m/s, a calm museum pace

const keyMap: Record<string, 'forward' | 'back' | 'left' | 'right'> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

// Drag-to-look instead of pointer lock: pointer lock freezes the cursor, which breaks R3F
// click raycasts on exhibits. A small threshold keeps a plain click a click.
const LOOK_SENSITIVITY = 0.0035
const DRAG_THRESHOLD_PX = 4
const MAX_PITCH = Math.PI / 2 - 0.05

const euler = new Euler(0, 0, 0, 'YXZ')
const forward = new Vector3()
const right = new Vector3()
const up = new Vector3(0, 1, 0)

export function DesktopControls() {
  const camera = useThree((s) => s.camera)
  const inXR = useXR((s) => s.session != null)
  const pressed = useRef({ forward: false, back: false, left: false, right: false })

  // Place the camera at the player's origin once, and again whenever a reset moves the player.
  useEffect(
    () =>
      usePlayerStore.subscribe((s, prev) => {
        if (s.origin !== prev.origin || s.yaw !== prev.yaw) {
          camera.position.set(s.origin[0], s.origin[1] + eyeHeight(s.posture), s.origin[2])
          camera.rotation.set(0, s.yaw, 0, 'YXZ')
        } else if (s.posture !== prev.posture) {
          // Standing up keeps where you are and where you look; only the eyes rise.
          camera.position.y = s.origin[1] + eyeHeight(s.posture)
        }
      }),
    [camera],
  )
  useEffect(() => {
    const { origin, yaw, posture } = usePlayerStore.getState()
    camera.position.set(origin[0], origin[1] + eyeHeight(posture), origin[2])
    camera.rotation.set(0, yaw, 0, 'YXZ')
  }, [camera])

  useEffect(() => {
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const dir = keyMap[e.code]
      if (dir) pressed.current[dir] = down
    }
    const onDown = onKey(true)
    const onUp = onKey(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    let drag: { x: number; y: number; moved: boolean } | null = null
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      drag = { x: e.clientX, y: e.clientY, moved: false }
    }
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      drag.moved = true
      drag.x = e.clientX
      drag.y = e.clientY
      euler.setFromQuaternion(camera.quaternion)
      euler.y -= dx * LOOK_SENSITIVITY
      euler.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, euler.x - dy * LOOK_SENSITIVITY))
      camera.quaternion.setFromEuler(euler)
    }
    const onUp = () => {
      drag = null
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl, camera])

  useFrame((_, delta) => {
    if (inXR) return
    const p = pressed.current
    const z = Number(p.forward) - Number(p.back)
    const x = Number(p.right) - Number(p.left)
    if (z === 0 && x === 0) return
    if (usePlayerStore.getState().posture === 'seated') usePlayerStore.getState().standUp()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, up)
    const step = WALK_SPEED * Math.min(delta, 0.1)
    const next = camera.position
      .clone()
      .addScaledVector(forward, z * step)
      .addScaledVector(right, x * step)
    const [nx, nz] = resolveCircle(
      next.x,
      next.z,
      PLAYER_RADIUS,
      usePlayerStore.getState().colliders,
    )
    camera.position.set(nx, camera.position.y, nz)
  })

  return null
}
