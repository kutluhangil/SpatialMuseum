import { describe, expect, it } from 'vitest'
import { detectTier, qualityFor, type DeviceTier } from '../src/xr/device'

// Real user agent strings from the Meta Quest Browser and a desktop Chrome.
const UA = {
  quest2:
    'Mozilla/5.0 (X11; Linux x86_64; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0.0.1.1 SamsungBrowser/4.0 Chrome/126.0.6478.122 VR Safari/537.36',
  quest3:
    'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0.0.1.1 SamsungBrowser/4.0 Chrome/126.0.6478.122 VR Safari/537.36',
  quest3s:
    'Mozilla/5.0 (X11; Linux x86_64; Quest 3S) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/34.0 Chrome/128.0 VR Safari/537.36',
  questPro:
    'Mozilla/5.0 (X11; Linux x86_64; Quest Pro) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0 Chrome/126.0 VR Safari/537.36',
  unknownQuest:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/40.0 Chrome/140.0 VR Safari/537.36',
  desktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
}

describe('detectTier', () => {
  it('names the headset from the Quest Browser user agent', () => {
    expect(detectTier(UA.quest2)).toBe('quest2')
    expect(detectTier(UA.quest3)).toBe('quest3')
    expect(detectTier(UA.quest3s)).toBe('quest3')
    expect(detectTier(UA.questPro)).toBe('questpro')
  })

  it('treats an unrecognised Meta browser as the weakest headset', () => {
    expect(detectTier(UA.unknownQuest)).toBe('quest2')
  })

  it('falls back to desktop for an ordinary browser', () => {
    expect(detectTier(UA.desktop)).toBe('desktop')
    expect(detectTier('')).toBe('desktop')
  })
})

describe('quality profiles', () => {
  it('spends less on a Quest 2 than on a Quest 3 in every dimension', () => {
    const two = qualityFor('quest2')
    const three = qualityFor('quest3')
    expect(two.framebufferScale).toBeLessThan(three.framebufferScale)
    expect(two.foveation).toBeGreaterThan(three.foveation)
    expect(two.targetFrameRate).toBeLessThan(three.targetFrameRate)
    expect(two.anisotropy).toBeLessThan(three.anisotropy)
    expect(two.floorGlare).toBe(false)
    expect(two.boardGhost).toBe(false)
  })

  it('keeps every tier inside what a headset can actually run', () => {
    for (const tier of ['quest2', 'quest3', 'questpro', 'desktop'] as DeviceTier[]) {
      const q = qualityFor(tier)
      expect(q.framebufferScale).toBeGreaterThanOrEqual(1)
      expect(q.framebufferScale).toBeLessThanOrEqual(1.3)
      expect(q.foveation).toBeGreaterThanOrEqual(0)
      expect(q.foveation).toBeLessThanOrEqual(1)
      expect([72, 90, 120]).toContain(q.targetFrameRate)
    }
  })
})
