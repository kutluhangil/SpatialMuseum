import { useEffect, useMemo } from 'react'
import { SRGBColorSpace, VideoTexture } from 'three'
import { videoManager } from './VideoManager'

const pendingTeardown = new WeakMap<HTMLVideoElement, ReturnType<typeof setTimeout>>()

/** Creates a paused, CORS-enabled video element and its texture; disposes both on unmount. */
export function useVideoElement(src: string, loop = false) {
  const video = useMemo(() => {
    const el = document.createElement('video')
    // Without anonymous CORS a cross-origin (R2) video taints WebGL and plays silent through Web Audio.
    el.crossOrigin = 'anonymous'
    el.playsInline = true
    el.preload = 'metadata'
    el.loop = loop
    return el
  }, [loop])

  const texture = useMemo(() => {
    const t = new VideoTexture(video)
    t.colorSpace = SRGBColorSpace
    return t
  }, [video])

  // Teardown releases the decoder and cancels the texture's frame callback, which cannot be
  // restarted. StrictMode (dev) unmounts and remounts effects synchronously while keeping the memo,
  // so teardown waits one task: a remount in between cancels it, a real unmount lets it run.
  useEffect(() => {
    const pending = pendingTeardown.get(video)
    if (pending !== undefined) {
      clearTimeout(pending)
      pendingTeardown.delete(video)
    }
    if (video.getAttribute('src') !== src) video.setAttribute('src', src)
    return () => {
      videoManager.pause(video)
      pendingTeardown.set(
        video,
        setTimeout(() => {
          pendingTeardown.delete(video)
          video.removeAttribute('src')
          video.load()
          texture.dispose()
        }, 0),
      )
    }
  }, [video, texture, src])

  return { video, texture }
}
