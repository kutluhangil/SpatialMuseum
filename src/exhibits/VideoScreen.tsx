import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Text, useTexture } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { Mesh } from 'three'
import { palette } from '../design/tokens'
import { EXHIBIT_VIEW_DISTANCE, fontUrls, textSizes } from '../design/typography'
import { useVideoElement } from '../media/useVideoElement'
import { videoManager } from '../media/VideoManager'
import { clockText, pauseGlyph, playBadge, playGlyph } from './videoGlyphs'

type Props = {
  src: string
  poster: string
  width: number
  aspect: number
  loop?: boolean
}

// Hung like a painting: the room draws its mat, gilt frame and picture light (ExhibitFrames). The
// badge over the still until it runs is what says it is a film, and something to press.
const PLAY_BADGE = 0.12

// The control strip along the foot of the picture, as on any player: state on the left, elapsed
// and total time on the right, and the elapsed share of the film drawn under both.
const BAR = { height: 0.14, pad: 0.05, glyph: 0.062, progress: 0.012 }

/** A wall screen that shows its poster until first played; click toggles playback. */
export function VideoScreen({ src, poster, width, aspect, loop = false }: Props) {
  const { video, texture } = useVideoElement(src, loop)
  const posterTexture = useTexture(poster)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const height = width / aspect
  const glyphs = useMemo(
    () => ({
      play: playGlyph(BAR.glyph),
      pause: pauseGlyph(BAR.glyph),
      badge: playBadge(PLAY_BADGE),
    }),
    [],
  )
  useEffect(() => () => Object.values(glyphs).forEach((g) => g.dispose()), [glyphs])

  // The manager pauses one film to start another, so the strip follows the element, never the click.
  useEffect(() => {
    const sync = () => setPlaying(!video.paused)
    for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, sync)
    return () => {
      for (const event of ['play', 'pause', 'ended']) video.removeEventListener(event, sync)
    }
  }, [video])

  const fill = useRef<Mesh>(null)
  const clock = useRef<ComponentRef<typeof Text>>(null)
  const shownSecond = useRef(-1)
  useFrame(() => {
    if (!started) return
    const { currentTime, duration } = video
    const played = Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0
    if (fill.current) {
      // Scaling a unit-wide bar keeps the progress free of per-frame geometry uploads.
      fill.current.scale.x = Math.max(1e-4, Math.min(1, played))
      fill.current.position.x = (-width + width * fill.current.scale.x) / 2
    }
    const second = Math.floor(currentTime)
    if (clock.current && second !== shownSecond.current) {
      shownSecond.current = second
      clock.current.text = `${clockText(currentTime)} / ${clockText(duration)}`
      clock.current.sync()
    }
  })

  const toggle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (video.paused) {
      setStarted(true)
      videoManager
        .play(video)
        .catch((err: unknown) => console.error(`video play failed: ${src}`, err))
    } else {
      videoManager.pause(video)
    }
  }

  const barY = -height / 2 + BAR.height / 2

  return (
    <group onClick={toggle}>
      <mesh>
        <planeGeometry args={[width, height]} />
        {/* Unlit and untone-mapped: the video should look exactly as encoded, not re-lit by the room. */}
        <meshBasicMaterial map={started ? texture : posterTexture} toneMapped={false} />
      </mesh>
      {!started && (
        <mesh geometry={glyphs.badge} position-z={0.004}>
          <meshBasicMaterial color={palette.murekkep} transparent opacity={0.72} />
        </mesh>
      )}
      {started && (
        <group position={[0, barY, 0.004]}>
          <mesh>
            <planeGeometry args={[width, BAR.height]} />
            <meshBasicMaterial color={palette.murekkep} transparent opacity={0.72} />
          </mesh>
          <mesh
            geometry={playing ? glyphs.pause : glyphs.play}
            position={[-width / 2 + BAR.pad + BAR.glyph / 2, 0, 0.001]}
          >
            <meshBasicMaterial color={palette.onsut} />
          </mesh>
          <Text
            ref={clock}
            font={fontUrls.regular}
            fontSize={textSizes(EXHIBIT_VIEW_DISTANCE).body}
            color={palette.onsut}
            anchorX="right"
            anchorY="middle"
            position={[width / 2 - BAR.pad, 0, 0.001]}
          >
            {'0:00 / --:--'}
          </Text>
          {/* Anchored to the left edge and scaled, so the bar grows rather than being rebuilt. */}
          <mesh ref={fill} position={[-width / 2, -BAR.height / 2 + BAR.progress / 2, 0.001]}>
            <planeGeometry args={[width, BAR.progress]} />
            <meshBasicMaterial color={palette.kolostrum} />
          </mesh>
        </group>
      )}
    </group>
  )
}
