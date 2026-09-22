import { Text } from '@react-three/drei'
import { useXR } from '@react-three/xr'
import { palette } from '../design/tokens'
import { fontUrls } from '../design/typography'
import { usePerfStats } from './desktop/perfStats'
import { deviceTier, quality } from '../xr/device'

/**
 * The same numbers as the desktop readout, but on the wall: the DOM overlay is invisible inside a
 * headset, and calibrating a Quest 2 means watching frame rate and draw calls while wearing it.
 * Only mounted when the page is opened with `?stats`.
 */
export function XRPerfPanel({
  position,
  rotationY,
}: {
  position: [number, number, number]
  rotationY: number
}) {
  const stats = usePerfStats((s) => s.stats)
  const inXR = useXR((s) => s.session != null)
  if (!inXR || !stats) return null
  const budget = `${quality.framebufferScale}× · fov ${quality.foveation} · ${quality.targetFrameRate} Hz`
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[1.5, 0.3]} />
        <meshBasicMaterial color={palette.murekkep} />
      </mesh>
      <Text
        font={fontUrls.regular}
        fontSize={0.055}
        color={palette.onsut}
        anchorX="center"
        anchorY="middle"
        position-y={0.06}
      >
        {`${stats.fps} fps · draw ${stats.calls} · tri ${stats.triangles}`}
      </Text>
      <Text
        font={fontUrls.regular}
        fontSize={0.045}
        color={palette.kolostrum}
        anchorX="center"
        anchorY="middle"
        position-y={-0.06}
      >
        {`${deviceTier} · ${budget}`}
      </Text>
    </group>
  )
}
