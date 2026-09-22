import { expect, test, type Page } from '@playwright/test'

// Fixed viewpoints, so a screenshot always frames the same thing: the seat a student starts in,
// the window wall with its blinds and sunlight, and the board with the lesson on it.
const VIEWS = [
  { name: 'seat', x: 0.9, z: -1.85, yaw: 0.19, pitch: 0 },
  { name: 'windows', x: 1.5, z: 1.0, yaw: Math.PI / 2 - 0.15, pitch: 90 },
  { name: 'posters', x: 0, z: 2.0, yaw: Math.PI, pitch: 0 },
  { name: 'videos', x: 3.0, z: 0, yaw: -Math.PI / 2 + 0.1, pitch: 0 },
]

/** Places the camera through the player store and lets a few frames render. */
async function look(page: Page, view: (typeof VIEWS)[number]) {
  await page.evaluate(async (v) => {
    const store = await import('/src/locomotion/playerStore.ts')
    store.usePlayerStore.getState().reset([v.x, 0, v.z], v.yaw, 'standing')
    await new Promise((done) => setTimeout(done, 200))
    if (v.pitch !== 0) {
      const canvas = document.querySelector('canvas')
      canvas?.dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, clientX: 600, clientY: 400, bubbles: true }),
      )
      for (let i = 1; i <= 10; i++) {
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: 600,
            clientY: 400 + (v.pitch * i) / 10,
            bubbles: true,
          }),
        )
      }
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    }
    await new Promise((done) => setTimeout(done, 600))
  }, view)
}

async function openClassroom(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  await page.goto('/?stats')
  await page.locator('canvas').waitFor()
  // The floor and panorama textures are fetched and transcoded; give them time to land.
  await page.waitForFunction(
    () => (document.querySelector('canvas') as HTMLCanvasElement | null)?.width ?? 0 > 0,
  )
  await page.waitForTimeout(2500)
  return errors
}

test('the classroom draws, stays inside its draw-call budget and looks unchanged', async ({
  page,
}) => {
  const errors = await openClassroom(page)

  // The room appears only once its KTX2 textures are transcoded, which the software renderer
  // does at its own pace; wait for a frame that actually drew the classroom.
  await page.waitForFunction(
    async () => {
      const perf = await import('/src/ui/desktop/perfStats.ts')
      return (perf.usePerfStats.getState().stats?.triangles ?? 0) > 1000
    },
    undefined,
    { timeout: 30_000 },
  )
  const stats = await page.evaluate(async () => {
    const perf = await import('/src/ui/desktop/perfStats.ts')
    return perf.usePerfStats.getState().stats
  })
  expect(stats, 'the performance probe reported no frame').not.toBeNull()
  // PLAN §11: every draw call is issued twice in VR. A hall with the class's exhibition on two
  // walls costs more than the bare room did, but stays far below what a Quest 2 can submit.
  expect(stats?.calls ?? 999).toBeLessThan(70)

  for (const view of VIEWS) {
    await look(page, view)
    await expect(page).toHaveScreenshot(`${view.name}.png`, { animations: 'disabled' })
  }

  expect(errors, 'the browser console reported errors').toEqual([])
})

test('the light switch and the blinds change the room', async ({ page }) => {
  await openClassroom(page)
  const windows = VIEWS.find((v) => v.name === 'windows')
  if (!windows) throw new Error('the windows viewpoint is missing')
  await look(page, windows)

  const before = await page.screenshot()
  await page.evaluate(async () => {
    const room = await import('/src/classroom/roomStore.ts')
    room.useRoomStore.getState().toggleLights()
    room.useRoomStore.getState().toggleBlinds()
  })
  // The blinds travel for about a second and a half.
  await page.waitForTimeout(2500)
  const after = await page.screenshot()

  expect(Buffer.compare(before, after), 'the room looked identical with the lights off').not.toBe(0)
})

// The Quest 2 is the weakest device the room has to run on. With its user agent the app picks the
// cheap profile, so the decorative transparent passes must be gone and the budget must still hold.
test.describe('on a Quest 2', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0.0.1.1 SamsungBrowser/4.0 Chrome/126.0.6478.122 VR Safari/537.36',
  })

  test('drops the decorative passes and stays well inside the budget', async ({ page }) => {
    const errors = await openClassroom(page)
    const profile = await page.evaluate(async () => {
      const device = await import('/src/xr/device.ts')
      return { tier: device.deviceTier, quality: device.quality }
    })
    expect(profile.tier).toBe('quest2')
    expect(profile.quality.floorGlare).toBe(false)
    expect(profile.quality.boardGhost).toBe(false)
    expect(profile.quality.framebufferScale).toBe(1)

    await page.waitForFunction(
      async () => {
        const perf = await import('/src/ui/desktop/perfStats.ts')
        return (perf.usePerfStats.getState().stats?.triangles ?? 0) > 1000
      },
      undefined,
      { timeout: 30_000 },
    )
    const stats = await page.evaluate(async () => {
      const perf = await import('/src/ui/desktop/perfStats.ts')
      return perf.usePerfStats.getState().stats
    })
    // Two draws per frame in VR: the whole room, exhibition included, has to stay inside this.
    expect(stats?.calls ?? 999).toBeLessThan(60)
    expect(errors, 'the browser console reported errors').toEqual([])
  })
})
