import { Suspense } from 'react'
import { Text } from '@react-three/drei'
import { TeleportTarget } from '@react-three/xr'
import { palette } from '../design/tokens'
import { fontUrls } from '../design/typography'
import { mediaUrl } from '../media/mediaUrl'
import { VideoScreen } from '../exhibits/VideoScreen'
import { usePlayerStore } from '../locomotion/playerStore'
import { LegibilityChart } from './LegibilityChart'
import { UikitFontTest } from './UikitFontTest'

const W = 8
const D = 8
const H = 3.6

/** Faz 0 device spike: one room that exercises text, video, teleport and snap turn on Quest. */
export function SpikeScene() {
  const teleport = usePlayerStore((s) => s.teleport)
  return (
    <group>
      <TeleportTarget onTeleport={(p) => teleport([p.x, 0, p.z])}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[W, D]} />
          <meshLambertMaterial color={palette.mese} />
        </mesh>
      </TeleportTarget>
      <mesh rotation-x={Math.PI / 2} position-y={H}>
        <planeGeometry args={[W, D]} />
        <meshLambertMaterial color={palette.onsut} />
      </mesh>
      {/* Four inward-facing walls: north, south, west, east. */}
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshLambertMaterial color={palette.onsut} />
      </mesh>
      <mesh position={[0, H / 2, D / 2]} rotation-y={Math.PI}>
        <planeGeometry args={[W, H]} />
        <meshLambertMaterial color={palette.onsut} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[D, H]} />
        <meshLambertMaterial color={palette.adacayi} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[D, H]} />
        <meshLambertMaterial color={palette.onsut} />
      </mesh>

      {/* Standing 2 m in front of spawn so the dmm rows are read at their design distance. */}
      <group position={[0, 1.5, 0]}>
        <Suspense fallback={null}>
          <LegibilityChart />
        </Suspense>
      </group>

      <group position={[-W / 2 + 0.02, 1.55, 0]} rotation-y={Math.PI / 2}>
        <Suspense fallback={null}>
          <VideoScreen
            src={mediaUrl('videos/spike-test-pattern.mp4')}
            poster={mediaUrl('posters/spike-test-pattern.jpg')}
            width={2.2}
            aspect={16 / 9}
            loop
          />
        </Suspense>
      </group>

      <group position={[W / 2 - 0.02, 1.5, 0]} rotation-y={-Math.PI / 2}>
        <mesh position-z={-0.005}>
          <planeGeometry args={[2.4, 1]} />
          <meshBasicMaterial color={palette.onsut} />
        </mesh>
        <Text
          font={fontUrls.bold}
          fontSize={0.14}
          color={palette.murekkep}
          position-y={0.2}
          maxWidth={2.2}
        >
          Emzirme pozisyonları
        </Text>
        <Text font={fontUrls.regular} fontSize={0.07} color={palette.murekkep} position-y={-0.15}>
          ĞÜŞİÖÇ ğüşıöç — troika
        </Text>
      </group>

      <group position={[0, 2.9, -D / 2 + 0.05]}>
        <Suspense fallback={null}>
          <UikitFontTest />
        </Suspense>
      </group>
    </group>
  )
}
