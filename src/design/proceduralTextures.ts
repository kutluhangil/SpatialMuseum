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

let sunShaft: CanvasTexture | null = null

/**
 * A face of a sunbeam hanging in the air: strongest near the window and thinning towards the
 * floor, soft along both long edges, with faint streaks of drifting dust. Additive: black adds
 * nothing. Canvas row 0 is the window end (uv v = 0 there, so the texture is flipped).
 */
export function sunShaftTexture(): CanvasTexture {
  sunShaft ??= canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
    const along = ctx.createLinearGradient(0, 0, 0, s)
    along.addColorStop(0, '#ffffff')
    along.addColorStop(0.55, '#707070')
    along.addColorStop(1, '#000000')
    ctx.fillStyle = along
    ctx.fillRect(0, 0, s, s)
    // Dust: a few lighter and darker streaks running down the beam.
    let seed = 11
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    ctx.filter = `blur(${s * 0.02}px)`
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)'
      ctx.fillRect(rand() * s, 0, s * (0.02 + rand() * 0.05), s)
    }
    ctx.filter = 'none'
    ctx.globalCompositeOperation = 'destination-in'
    const across = ctx.createLinearGradient(0, 0, s, 0)
    across.addColorStop(0, 'rgba(0,0,0,0)')
    across.addColorStop(0.2, 'rgba(0,0,0,1)')
    across.addColorStop(0.8, 'rgba(0,0,0,1)')
    across.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = across
    ctx.fillRect(0, 0, s, s)
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
  })
  sunShaft.flipY = false
  return sunShaft
}

let pictureWash: CanvasTexture | null = null

/**
 * The pool of light a picture lamp throws down a wall: brightest just under the hood, spreading
 * and fading towards the floor, with soft sides. Additive, so black adds nothing. Canvas row 0 is
 * the lamp end (uv v = 1).
 */
export function pictureWashTexture(): CanvasTexture {
  pictureWash ??= canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
    const glow = ctx.createRadialGradient(s / 2, s * 0.14, 0, s / 2, s * 0.14, s * 0.85)
    glow.addColorStop(0, '#ffffff')
    glow.addColorStop(0.3, '#9a9a9a')
    glow.addColorStop(0.7, '#262626')
    glow.addColorStop(1, '#000000')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, s, s)
    // Every edge fades to black, so the quad itself never shows on the wall. The top fades
    // fastest: the hood cuts the light off above itself.
    ctx.globalCompositeOperation = 'destination-in'
    const across = ctx.createLinearGradient(0, 0, s, 0)
    across.addColorStop(0, 'rgba(0,0,0,0)')
    across.addColorStop(0.3, 'rgba(0,0,0,1)')
    across.addColorStop(0.7, 'rgba(0,0,0,1)')
    across.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = across
    ctx.fillRect(0, 0, s, s)
    const down = ctx.createLinearGradient(0, 0, 0, s)
    down.addColorStop(0, 'rgba(0,0,0,0)')
    down.addColorStop(0.12, 'rgba(0,0,0,1)')
    down.addColorStop(0.75, 'rgba(0,0,0,1)')
    down.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = down
    ctx.fillRect(0, 0, s, s)
    // Transparent pixels would read as zero light anyway; flatten onto black for the additive blend.
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
  })
  return pictureWash
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
 * How much wall one repeat of the plaster covers. Wide enough that its patches read as unevenness
 * rather than as a pattern repeating every metre.
 */
export const PLASTER_METRES = 2.5

/** A deterministic random source, so every load (and every screenshot) draws the same texture. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

/**
 * Tileable value noise in 0..1: a lattice of random values that wraps at the edges, smoothly
 * interpolated, summed over octaves. Wrapping is what lets a repeating wall texture show no seam.
 */
function tileableNoise(size: number, cells: readonly number[], seed: number): Float32Array {
  const rand = seeded(seed)
  const out = new Float32Array(size * size)
  let total = 0
  cells.forEach((n, octave) => {
    const amp = 1 / 2 ** octave
    total += amp
    const lattice = Array.from({ length: n * n }, () => rand())
    const at = (i: number, j: number) => lattice[((j + n) % n) * n + ((i + n) % n)] ?? 0
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * n
      const j = Math.floor(fy)
      const ty = fy - j
      const sy = ty * ty * (3 - 2 * ty)
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n
        const i = Math.floor(fx)
        const tx = fx - i
        const sx = tx * tx * (3 - 2 * tx)
        const top = at(i, j) + (at(i + 1, j) - at(i, j)) * sx
        const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx
        out[y * size + x] = (out[y * size + x] ?? 0) + (top + (bottom - top) * sy) * amp
      }
    }
  })
  return out.map((v) => v / total)
}

/**
 * Painted plaster, one repeat covering PLASTER_METRES of wall: near-white, so multiplying a wall's
 * baked colour by it only breaks up the flatness. Soft mottling from the roller at two scales
 * and a fine grain from the plaster under the paint, all tileable noise: no shape in it repeats
 * or reads as a patch with an edge.
 */
export function plasterTexture(): CanvasTexture {
  plaster ??= canvasTexture(512, (ctx, s) => {
    const mottle = tileableNoise(s, [3, 6, 12], 13)
    const grain = tileableNoise(s, [128, 256], 29)
    const img = ctx.createImageData(s, s)
    for (let i = 0; i < s * s; i++) {
      // About ±3 % of mottling and ±2 % of grain around a white a shade under full.
      const v = 0.975 + ((mottle[i] ?? 0.5) - 0.5) * 0.12 + ((grain[i] ?? 0.5) - 0.5) * 0.08
      const c = Math.round(Math.min(1, Math.max(0, v)) * 255)
      img.data.set([c, c, c, 255], i * 4)
    }
    ctx.putImageData(img, 0, 0)
  })
  plaster.wrapS = RepeatWrapping
  plaster.wrapT = RepeatWrapping
  return plaster
}

let wainscot: CanvasTexture | null = null

/** Width of one laminate panel below the chair rail, and so of one repeat of its texture. */
export const PANEL_METRES = 1.2

/**
 * High-pressure laminate wall panelling in an oak decor, one panel per repeat: near-white grain
 * (the vertex colour carries the oak), a joint to the next panel along one edge, and the shade
 * the chair rail casts along the top. The texture spans the full height of the panelling.
 */
export function wainscotTexture(): CanvasTexture {
  wainscot ??= canvasTexture(512, (ctx, s) => {
    const rand = seeded(41)
    // Horizontal grain: long, gently waving streaks of lighter and darker wood.
    const img = ctx.createImageData(s, s)
    const figure = tileableNoise(s, [2, 4, 8], 5)
    const phase = Array.from({ length: 6 }, () => rand() * Math.PI * 2)
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = y * s + x
        const wave = Math.sin((x / s) * Math.PI * 2 + (phase[0] ?? 0)) * 6
        const band = Math.sin(
          ((y + wave + (figure[i] ?? 0) * 40) / s) * Math.PI * 58 + (phase[1] ?? 0),
        )
        const fine = Math.sin(((y + wave * 0.5) / s) * Math.PI * 260 + (phase[2] ?? 0))
        const v = 0.93 + band * 0.035 + fine * 0.012 + ((figure[i] ?? 0.5) - 0.5) * 0.08
        const c = Math.round(Math.min(1, Math.max(0, v)) * 255)
        img.data.set([c, c, c, 255], i * 4)
      }
    }
    ctx.putImageData(img, 0, 0)
    // The joint between panels: a dark 3 mm gap with a lit chamfer beside it.
    ctx.fillStyle = 'rgba(40, 28, 16, 0.55)'
    ctx.fillRect(0, 0, 2, s)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.fillRect(2, 0, 1, s)
    // Canvas row 0 is the top (uv v = 1 after the flip): the rail's shadow falls there.
    const shade = ctx.createLinearGradient(0, 0, 0, s * 0.08)
    shade.addColorStop(0, 'rgba(0, 0, 0, 0.18)')
    shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, s, s * 0.08)
  })
  wainscot.wrapS = RepeatWrapping
  wainscot.wrapT = RepeatWrapping
  return wainscot
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
