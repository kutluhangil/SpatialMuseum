export const fontUrls = {
  regular: '/fonts/AtkinsonHyperlegibleNext-400.ttf',
  semibold: '/fonts/AtkinsonHyperlegibleNext-600.ttf',
  bold: '/fonts/AtkinsonHyperlegibleNext-700.ttf',
} as const

// Glyphs the uikit MSDF atlas must contain (PLAN §8.3); anything outside renders as a gap.
export const uikitCharset =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  'ÇĞİÖŞÜçğıöşü’“”–—…'

// Legibility floors in dmm (PLAN §7.4). Provisional until the Faz 0 headset calibration.
export const legibility = {
  bodyMinDmm: 35,
  titleMinDmm: 70,
} as const

/** Angular text size: 1 dmm = 1 mm of height seen from 1 m. */
export function dmm(textHeightMetres: number, distanceMetres: number): number {
  if (distanceMetres <= 0) {
    throw new Error(`dmm: distance must be positive, got ${distanceMetres}`)
  }
  return (textHeightMetres / distanceMetres) * 1000
}

/** Text height in metres that reaches the given dmm at the given distance. */
export function heightForDmm(targetDmm: number, distanceMetres: number): number {
  if (distanceMetres <= 0) {
    throw new Error(`heightForDmm: distance must be positive, got ${distanceMetres}`)
  }
  return (targetDmm * distanceMetres) / 1000
}

/** Typical viewing distance for wall exhibits: the guided-tour viewpoint (PLAN §14 Faz 6). */
export const EXHIBIT_VIEW_DISTANCE = 1.8

/** Minimum legible title/body em heights for text read from the given distance. */
export function textSizes(distanceMetres: number) {
  return {
    title: heightForDmm(legibility.titleMinDmm, distanceMetres),
    body: heightForDmm(legibility.bodyMinDmm, distanceMetres),
  }
}
