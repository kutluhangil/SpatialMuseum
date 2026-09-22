import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import { xrStore } from '../xr/xrStore'
import { DesktopControls } from '../locomotion/DesktopControls'
import { XRLocomotion } from '../locomotion/XRLocomotion'
import { HelpOverlay } from '../ui/desktop/HelpOverlay'
import { RoomAudio } from '../audio/RoomAudio'
import { palette } from '../design/tokens'
import { EnvironmentLight } from './EnvironmentLight'
import { statsEnabled } from '../ui/desktop/perfStats'
import { PerfProbe } from '../ui/desktop/PerfProbe'
import { PerfReadout } from '../ui/desktop/PerfReadout'

/** Shared canvas for every viewer route: desktop and XR input on one scene. */
export function Viewer({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full">
      {/* flat = no tone mapping: palette hexes render as specified, lighting is kept "baked" and low. */}
      <Canvas
        flat
        camera={{ fov: 70, near: 0.05, far: 200 }}
        gl={{ antialias: true }}
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={[palette.onsut]} />
        <XR store={xrStore}>
          {/* Only PBR props (frames, benches) and the spike room react to these; walls are baked. */}
          <hemisphereLight args={[palette.isik, palette.mese, 1.1]} />
          <directionalLight position={[3, 6, 4]} intensity={1.4} color={palette.isik} />
          <EnvironmentLight />
          <DesktopControls />
          <XRLocomotion />
          {children}
        </XR>
        {statsEnabled && <PerfProbe />}
      </Canvas>
      <RoomAudio />
      <HelpOverlay />
      {statsEnabled && <PerfReadout />}
    </div>
  )
}
