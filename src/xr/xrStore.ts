import { createXRStore } from '@react-three/xr'
import { deviceTier, quality } from './device'

/**
 * Eye-buffer settings come from the device tier (`./device`): a Quest 3 renders above native
 * resolution because the paintings and the board text are the point of the room, while a Quest 2
 * renders at native and leans on foveation to keep 72 Hz.
 *
 * Teleport is the comfort default; smooth translation stays off, as it is the main nausea trigger.
 */
export const xrStore = createXRStore({
  controller: { teleportPointer: true },
  hand: { teleportPointer: true },
  frameBufferScaling: (max) => Math.min(max, quality.framebufferScale),
  foveation: quality.foveation,
  // IWER desktop emulation is a dev tool: in production its ~5 MB of lazy chunks are never fetched.
  emulate: import.meta.env.DEV ? 'metaQuest3' : false,
})

export { deviceTier, quality }
