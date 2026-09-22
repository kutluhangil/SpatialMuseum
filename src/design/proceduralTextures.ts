import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three'
import { palette } from './tokens'

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

/**
 * Blurred rectangle for soft shadows, used as an alphaMap. alphaMap reads the green channel, so
 * the shape is white on black (black on transparent would read as zero everywhere).
 */
export function softShadowTexture(): CanvasTexture {
  softShadow ??= canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
    ctx.filter = `blur(${s * 0.08}px)`
    ctx.fillStyle = '#fff'
    const inset = s * 0.2
    ctx.fillRect(inset, inset, s - inset * 2, s - inset * 2)
  })
  // Coverage data, not colour: keep it out of the sRGB decode.
  softShadow.colorSpace = NoColorSpace
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

let ceilingTile: CanvasTexture | null = null

/**
 * One 60 cm suspended-ceiling tile: mineral-fibre surface with fine speckle, framed by half a
 * white T-bar on each edge (neighbouring tiles supply the other half) and a thin recess shadow.
 */
export function ceilingTileTexture(): CanvasTexture {
  ceilingTile ??= canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = palette.tavan
    ctx.fillRect(0, 0, s, s)
    // Deterministic speckle: the same ceiling every load.
    let seed = 7
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(90, 90, 84, ${0.05 + rand() * 0.12})`
      const r = 0.6 + rand() * 1.2
      ctx.fillRect(rand() * s, rand() * s, r, r)
    }
    const bar = Math.round(s * 0.02) // half of a 24 mm T-bar on a 600 mm tile
    ctx.fillStyle = palette.onsut
    ctx.fillRect(0, 0, s, bar)
    ctx.fillRect(0, s - bar, s, bar)
    ctx.fillRect(0, 0, bar, s)
    ctx.fillRect(s - bar, 0, bar, s)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.fillRect(bar, bar, s - bar * 2, 2)
    ctx.fillRect(bar, bar, 2, s - bar * 2)
  })
  ceilingTile.wrapS = RepeatWrapping
  ceilingTile.wrapT = RepeatWrapping
  return ceilingTile
}

let glass: CanvasTexture | null = null

/**
 * Window glass: an even faint haze plus two soft diagonal reflection streaks. White with alpha;
 * the material colour tints it.
 */
export function glassTexture(): CanvasTexture {
  glass ??= canvasTexture(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(0, 0, s, s)
    ctx.filter = `blur(${s * 0.04}px)`
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    for (const [x, w] of [
      [0.28, 0.16],
      [0.55, 0.06],
    ] as const) {
      ctx.beginPath()
      ctx.moveTo(s * x, 0)
      ctx.lineTo(s * (x + w), 0)
      ctx.lineTo(s * (x + w - 0.35), s)
      ctx.lineTo(s * (x - 0.35), s)
      ctx.closePath()
      ctx.fill()
    }
  })
  return glass
}
