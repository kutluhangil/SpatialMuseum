import { createXRStore } from '@react-three/xr'

// Render the eye buffers a bit above native resolution: text and painting detail are the point of
// this museum. Foveation pays for it by lowering resolution only in the periphery (Meta: often
// imperceptible). Both values are starting points to calibrate on the Quest 3S gate.
const FRAMEBUFFER_SCALE = 1.25
const FOVEATION = 0.75

// Teleport is the comfort default for seated postpartum users; smooth locomotion stays opt-in.
export const xrStore = createXRStore({
  controller: { teleportPointer: true },
  hand: { teleportPointer: true },
  frameBufferScaling: (max) => Math.min(max, FRAMEBUFFER_SCALE),
  foveation: FOVEATION,
  // IWER desktop emulation is a dev tool: in production its ~5 MB of lazy chunks are never fetched.
  emulate: import.meta.env.DEV ? 'metaQuest3' : false,
})
