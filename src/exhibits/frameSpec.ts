// Frame dimensions shared by the frame mesh and the per-room merged drop shadows.
export type FrameStyle = 'wood' | 'black'
export const FRAME_PROFILE: Record<FrameStyle, number> = { wood: 0.05, black: 0.03 }
export const FRAME_SHADOW = {
  spreadX: 0.16,
  spreadY: 0.2,
  offsetU: 0.015,
  offsetV: -0.04,
  depthBehind: 0.012,
}
