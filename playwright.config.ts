import { defineConfig, devices } from '@playwright/test'

const PORT = 5178

/**
 * Visual checks run against a real browser: the scene is drawn by WebGL, so a unit test can only
 * say the geometry was built, never that it was visible. Chromium's software renderer (SwiftShader)
 * draws the same pixels on every machine with the same driver, which is what makes the reference
 * screenshots comparable; regenerate them with `npm run test:visual -- --update-snapshots` after an
 * intended visual change, and expect small differences on a different OS or Chromium build.
 */
export default defineConfig({
  testDir: './tests-visual',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
