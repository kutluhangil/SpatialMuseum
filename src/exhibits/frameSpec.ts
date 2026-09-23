import type { ExhibitDef } from '../schema/museum'

// Frame dimensions shared by the frame mesh and the per-room merged drop shadows.
export type FrameStyle = 'wood' | 'black'
/** Every moulding the room can hang: the content's two painting frames plus the screens' gilt. */
export type Moulding = FrameStyle | 'gilt'
export const FRAME_PROFILE: Record<Moulding, number> = { wood: 0.05, black: 0.03, gilt: 0.085 }
// A screen is hung like a painting behind a mat: the mat keeps the gilt off the picture edge,
// where the player's control strip runs.
export const VIDEO_MAT = 0.07
export const FRAME_SHADOW = {
  spreadX: 0.16,
  spreadY: 0.2,
  offsetU: 0.015,
  offsetV: -0.04,
  depthBehind: 0.012,
}

/** The moulding an exhibit hangs in, or null when it hangs unframed. */
export function mouldingOf(exhibit: ExhibitDef): Moulding | null {
  if (exhibit.type === 'video') return 'gilt'
  if (exhibit.type === 'image' && (exhibit.frame === 'wood' || exhibit.frame === 'black')) {
    return exhibit.frame
  }
  return null
}

/** Mat width inside the moulding (0 for paintings, which are framed to the edge). */
export function matOf(exhibit: ExhibitDef): number {
  return exhibit.type === 'video' ? VIDEO_MAT : 0
}

/** How far the framing (mat plus moulding) reaches beyond the picture on every side. */
export function frameBorder(exhibit: ExhibitDef): number {
  const moulding = mouldingOf(exhibit)
  return moulding ? FRAME_PROFILE[moulding] + matOf(exhibit) : 0
}
