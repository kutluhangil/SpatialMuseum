import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFShadowMap } from 'three'
import { XR } from '@react-three/xr'
import { xrStore } from '../xr/xrStore'
import { XRFrameRate } from '../xr/XRFrameRate'
import { DesktopControls } from '../locomotion/DesktopControls'
import { XRLocomotion } from '../locomotion/XRLocomotion'
import { ComfortFade } from '../locomotion/ComfortFade'
import { HelpOverlay } from '../ui/desktop/HelpOverlay'
import { LoadingOverlay } from '../ui/desktop/LoadingOverlay'
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
        // MSAA is cheap on the tiled mobile GPUs in a Quest; the stencil buffer is pure bandwidth.
        gl={{ antialias: true, stencil: false, powerPreference: 'high-performance' }}
        style={{ touchAction: 'none' }}
        // The sun's shadow map is redrawn on demand (Sunlight), never per frame: the room is still.
        shadows={{ enabled: true, type: PCFShadowMap, autoUpdate: false }}
      >
        <color attach="background" args={[palette.onsut]} />
        <XR store={xrStore}>
          {/* Only PBR props (frames, benches) and the spike room react to these; walls are baked. */}
          <hemisphereLight args={[palette.isik, palette.mese, 1.1]} />
          <directionalLight position={[3, 6, 4]} intensity={1.4} color={palette.isik} />
          <EnvironmentLight />
          <XRFrameRate />
          <DesktopControls />
          <XRLocomotion />
          <ComfortFade />
          {children}
        </XR>
        {statsEnabled && <PerfProbe />}
      </Canvas>
      <RoomAudio />
      <LoadingOverlay />
      <HelpOverlay />
      {statsEnabled && <PerfReadout />}
    </div>
  )
}
