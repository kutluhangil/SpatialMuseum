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

let boardGhost: CanvasTexture | null = null

/**
 * What a whiteboard keeps after it is wiped: faint arcs of old ink and the dry streaks of the
 * eraser. Transparent, drawn over the board's own white surface.
 */
export function boardGhostTexture(): CanvasTexture {
  boardGhost ??= canvasTexture(512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s)
    ctx.filter = `blur(${s * 0.004}px)`
    ctx.strokeStyle = 'rgba(40, 70, 90, 0.05)'
    ctx.lineWidth = s * 0.012
    // Eraser passes: wide, almost horizontal sweeps.
    for (let i = 0; i < 9; i++) {
      const y = (i + 0.5) * (s / 9)
      ctx.beginPath()
      ctx.moveTo(s * 0.04, y + Math.sin(i * 3.1) * s * 0.01)
      ctx.bezierCurveTo(s * 0.35, y - s * 0.02, s * 0.65, y + s * 0.02, s * 0.96, y)
      ctx.stroke()
    }
    // Ghosts of writing that never quite came off.
    ctx.strokeStyle = 'rgba(30, 52, 64, 0.045)'
    ctx.lineWidth = s * 0.005
    for (let i = 0; i < 14; i++) {
      const x = s * 0.08 + (i % 7) * s * 0.12
      const y = s * (i < 7 ? 0.3 : 0.62)
      ctx.beginPath()
      ctx.arc(x, y, s * 0.03, Math.PI * 0.2, Math.PI * 1.5)
      ctx.stroke()
    }
  })
  return boardGhost
}

let plaster: CanvasTexture | null = null

/**
 * One square metre of painted plaster: near-white, so multiplying a wall's baked colour by it only
 * breaks up the flatness. Fine speckle for the render, plus faint roller streaks left by the brush.
 */
export function plasterTexture(): CanvasTexture {
  plaster ??= canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, s, s)
    // Broad, heavily blurred roller passes: visible as unevenness, never as stripes.
    ctx.filter = `blur(${s * 0.09}px)`
    for (let i = 0; i < 7; i++) {
      const x = (i / 7) * s + Math.sin(i * 7.31) * s * 0.03
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'rgba(255,255,255,0.03)'
      ctx.fillRect(x, 0, s * 0.07, s)
    }
    ctx.filter = `blur(${s * 0.008}px)`
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * s
      const y = Math.random() * s
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.035)'
      ctx.fillRect(x, y, 1.5, 1.5)
    }
  })
  plaster.wrapS = RepeatWrapping
  plaster.wrapT = RepeatWrapping
  return plaster
}

let floorGlare: CanvasTexture | null = null

/**
 * The window's reflection in a polished floor: brightest against the wall, stretching away and
 * fading out. Additive, so black adds nothing. Row 0 of the canvas is the wall end.
 */
export function floorGlareTexture(): CanvasTexture {
  floorGlare ??= canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
    const fade = ctx.createLinearGradient(0, 0, 0, s)
    fade.addColorStop(0, '#ffffff')
    fade.addColorStop(0.3, '#8a8a8a')
    fade.addColorStop(1, '#000000')
    // The blur softens the sides of the smear as well as its far end.
    ctx.filter = `blur(${s * 0.06}px)`
    ctx.fillStyle = fade
    const m = s * 0.1
    ctx.fillRect(m, 0, s - m * 2, s)
  })
  return floorGlare
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
