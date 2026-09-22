import { CanvasTexture, SRGBColorSpace } from 'three'

// Generated once on a canvas instead of shipping image files: a few KB of code, zero network.

function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable; cannot build procedural texture')
  draw(ctx, size)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

let softShadow: CanvasTexture | null = null

/** Blurred rounded rectangle in alpha: the drop shadow behind frames. */
export function softShadowTexture(): CanvasTexture {
  softShadow ??= canvasTexture(128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s)
    ctx.filter = `blur(${s * 0.08}px)`
    ctx.fillStyle = 'rgba(0,0,0,1)'
    const inset = s * 0.2
    ctx.fillRect(inset, inset, s - inset * 2, s - inset * 2)
  })
  return softShadow
}

let sunPatch: CanvasTexture | null = null

/**
 * Soft-edged window-shaped patch of sunlight, with the shadow of the glazing bars (one upright,
 * one transom) crossing it. Additive: black = no light.
 */
export function sunPatchTexture(): CanvasTexture {
  sunPatch ??= canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
    ctx.filter = `blur(${s * 0.035}px)`
    ctx.fillStyle = '#fff'
    const m = s * 0.1
    ctx.fillRect(m, m, s - m * 2, s - m * 2)
    ctx.fillStyle = '#000'
    ctx.fillRect(s / 2 - s * 0.02, 0, s * 0.04, s)
    ctx.fillRect(0, s * 0.36, s, s * 0.04)
  })
  return sunPatch
}
