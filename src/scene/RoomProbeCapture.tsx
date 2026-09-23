import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import {
  CubeCamera,
  HalfFloatType,
  LinearMipmapLinearFilter,
  PMREMGenerator,
  WebGLCubeRenderTarget,
  type Color,
  type Object3D,
  type Texture,
  type WebGLRenderTarget,
} from 'three'
import { useRoomStore } from '../classroom/roomStore'
import { attachProbe, markProbeCaptured, type RoomProbe } from './roomProbe'

// Small on purpose: the floor and glass read it blurred, and the frames through a PMREM blur.
const SIZE = 256
// Captures after mounting, and again whenever a round of loading finishes: textures (panorama,
// posters, paintings) land at their own pace, and a capture taken before them would reflect a
// bare room until the next one. The short delay lets the new texture reach the GPU first.
const CAPTURE_AFTER_MS = [300, 1500]
const AFTER_LOADING_MS = 250
// The blinds take about a second and a half to travel.
const AFTER_ROOM_CHANGE_MS = [200, 1800]

/** Mark an object to be left out of the probe: furniture would reflect in the wrong place. */
export const HIDE_FROM_PROBE = 'hideFromProbe'
/**
 * Mark a light source with how much brighter it really is than the screen can show. The capture
 * is HDR, so a lit panel or the daylit campus reflects as a highlight, not as one more white.
 */
export const PROBE_GAIN = 'probeGain'

type Tinted = { color: Color }
const isTinted = (m: unknown): m is Tinted =>
  typeof m === 'object' && m !== null && 'color' in m && (m as Tinted).color?.isColor === true

/**
 * Renders the room into its reflection probe a few times after loading and whenever the lights or
 * blinds change; never per frame. Also hands the capture, blurred, to the PBR frames as their
 * environment, so gilt and brass reflect this classroom rather than a generic studio.
 */
export function RoomProbeCapture({ probe }: { probe: RoomProbe }) {
  // Read the scene through get(): it is a mutable three object owned by R3F, not React state.
  const get = useThree((s) => s.get)
  const { target, camera } = useMemo(() => {
    const t = new WebGLCubeRenderTarget(SIZE, {
      type: HalfFloatType,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
    })
    const c = new CubeCamera(0.05, 60, t)
    return { target: t, camera: c }
  }, [])
  const pending = useRef(false)

  useEffect(() => {
    camera.position.copy(probe.centre.value)
    attachProbe(probe, target.texture)
    const timers = CAPTURE_AFTER_MS.map((ms) => setTimeout(() => (pending.current = true), ms))
    let roomTimers: ReturnType<typeof setTimeout>[] = []
    let loadTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribeLoading = useProgress.subscribe((s, prev) => {
      if (!prev.active || s.active) return
      clearTimeout(loadTimer)
      loadTimer = setTimeout(() => (pending.current = true), AFTER_LOADING_MS)
    })
    const unsubscribe = useRoomStore.subscribe((s, prev) => {
      if (s.lightsOn === prev.lightsOn && s.blindsDown === prev.blindsDown) return
      roomTimers.forEach(clearTimeout)
      roomTimers = AFTER_ROOM_CHANGE_MS.map((ms) => setTimeout(() => (pending.current = true), ms))
    })
    return () => {
      timers.forEach(clearTimeout)
      roomTimers.forEach(clearTimeout)
      clearTimeout(loadTimer)
      unsubscribeLoading()
      unsubscribe()
      attachProbe(probe, null)
    }
  }, [camera, target, probe])

  const env = useRef<{
    pmrem: PMREMGenerator
    blurred: WebGLRenderTarget | null
    previous: Texture | null
  }>(null)
  useEffect(() => {
    const { gl, scene } = get()
    env.current = { pmrem: new PMREMGenerator(gl), blurred: null, previous: scene.environment }
    return () => {
      const e = env.current
      if (!e) return
      if (e.blurred && scene.environment === e.blurred.texture) scene.environment = e.previous
      e.blurred?.dispose()
      e.pmrem.dispose()
      target.dispose()
    }
  }, [get, target])

  useFrame(() => {
    if (!pending.current) return
    pending.current = false
    const { gl, scene } = get()
    const hidden: Object3D[] = []
    const boosted: [Tinted, number][] = []
    scene.traverse((o) => {
      if (o.userData[HIDE_FROM_PROBE] && o.visible) {
        o.visible = false
        hidden.push(o)
      }
      const gain: unknown = o.userData[PROBE_GAIN]
      const material: unknown = 'material' in o ? o.material : null
      if (typeof gain === 'number' && isTinted(material)) {
        material.color.multiplyScalar(gain)
        boosted.push([material, gain])
      }
    })
    // Detached while it renders: the floor and glass would otherwise read the cube being drawn.
    attachProbe(probe, null)
    // A shadow map pass still owed must wait for the main render: taken now, it would be drawn
    // without the furniture hidden above.
    const shadowsOwed = gl.shadowMap.needsUpdate
    gl.shadowMap.needsUpdate = false
    camera.update(gl, scene)
    gl.shadowMap.needsUpdate = shadowsOwed
    attachProbe(probe, target.texture)
    hidden.forEach((o) => (o.visible = true))
    boosted.forEach(([m, gain]) => m.color.multiplyScalar(1 / gain))
    markProbeCaptured(probe)

    const e = env.current
    if (!e) return
    const blurred = e.pmrem.fromCubemap(target.texture)
    // Only take over an environment this probe set, or the one it found: never another room's.
    if (scene.environment === e.blurred?.texture || scene.environment === e.previous) {
      scene.environment = blurred.texture
    }
    e.blurred?.dispose()
    e.blurred = blurred
  })
  return null
}
