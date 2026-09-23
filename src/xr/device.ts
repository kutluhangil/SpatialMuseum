/**
 * Which headset (if any) the page is running on, and what that headset can afford.
 *
 * Quest 2 is the floor we design for: an XR2 Gen 1 at 72 Hz with roughly half the fill rate of a
 * Quest 3, and no multiview in the classic WebGL renderer, so every draw call and every transparent
 * pixel is paid for twice. Anything that costs fill without carrying meaning is switched off there.
 */
export type DeviceTier = 'quest2' | 'quest3' | 'questpro' | 'desktop'

export type Quality = {
  /** Eye-buffer resolution relative to the headset's native recommendation. */
  framebufferScale: number
  /** 0 = none, 1 = strongest peripheral blur; it buys back most of the cost of a larger buffer. */
  foveation: number
  targetFrameRate: number
  /** Cap on texture anisotropy: sharp floors are worth little if the frame is late. */
  anisotropy: number
  /** Reflective glazing over the framed screens: a transparent pass over every screen. */
  screenGlass: boolean
  /** Faint wiped-marker layer over the whiteboard: an extra transparent pass across the board. */
  boardGhost: boolean
  /** Warm pools the picture lights throw on the walls: additive quads, a few square metres each. */
  pictureLights: boolean
  /** Sunlight on the desks and chairs: the whole furniture mesh drawn a second time, additively. */
  sunOnFurniture: boolean
  /** Shafts of sunlight in the air: large transparent faces, seen through twice. */
  sunShafts: boolean
}

const QUALITY: Record<DeviceTier, Quality> = {
  // Native buffer, strongest foveation, and the two decorative transparent passes dropped.
  quest2: {
    framebufferScale: 1,
    foveation: 1,
    targetFrameRate: 72,
    anisotropy: 4,
    screenGlass: false,
    boardGhost: false,
    pictureLights: false,
    sunOnFurniture: false,
    sunShafts: false,
  },
  quest3: {
    framebufferScale: 1.25,
    foveation: 0.75,
    targetFrameRate: 90,
    anisotropy: 8,
    screenGlass: true,
    boardGhost: true,
    pictureLights: true,
    sunOnFurniture: true,
    sunShafts: true,
  },
  questpro: {
    framebufferScale: 1.2,
    foveation: 0.8,
    targetFrameRate: 90,
    anisotropy: 8,
    screenGlass: true,
    boardGhost: true,
    pictureLights: true,
    sunOnFurniture: true,
    sunShafts: true,
  },
  desktop: {
    framebufferScale: 1.25,
    foveation: 0.5,
    targetFrameRate: 90,
    anisotropy: 16,
    screenGlass: true,
    boardGhost: true,
    pictureLights: true,
    sunOnFurniture: true,
    sunShafts: true,
  },
}

/**
 * Reads the tier from the browser's user agent. Meta's browser names the device ("Quest 2",
 * "Quest 3S"); an unrecognised Meta or Oculus browser is treated as a Quest 2, because guessing
 * high costs frames on the weakest device while guessing low only costs a little sharpness.
 */
export function detectTier(userAgent: string): DeviceTier {
  const ua = userAgent.toLowerCase()
  if (/quest 3|quest3/.test(ua)) return 'quest3'
  if (/quest pro|questpro/.test(ua)) return 'questpro'
  if (/quest 2|quest2/.test(ua)) return 'quest2'
  if (/oculusbrowser|oculus|quest|meta horizon/.test(ua)) return 'quest2'
  return 'desktop'
}

export const deviceTier: DeviceTier = detectTier(
  typeof navigator === 'undefined' ? '' : navigator.userAgent,
)

export const quality: Quality = QUALITY[deviceTier]

export function qualityFor(tier: DeviceTier): Quality {
  return QUALITY[tier]
}
