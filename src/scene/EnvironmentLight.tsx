import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * Image-based light for the few PBR surfaces (frames, benches), generated locally from three's
 * RoomEnvironment: no HDR download, one PMREM pass at startup.
 */
export function EnvironmentLight({ intensity = 0.9 }: { intensity?: number }) {
  // Read the scene through get(): it is a mutable three object owned by R3F, not React state.
  const get = useThree((s) => s.get)
  useEffect(() => {
    const { gl, scene } = get()
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04).texture
    scene.environment = env
    scene.environmentIntensity = intensity
    room.dispose()
    pmrem.dispose()
    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [get, intensity])
  return null
}
