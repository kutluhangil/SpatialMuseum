import { useEffect } from 'react'
import { Text } from '@react-three/drei'
import type { LessonVideoDef } from '../schema/museum'
import type { ScreenContent } from './lesson'
import type { WallArea } from '../classroom/layout'
import { palette } from '../design/tokens'
import { fontUrls, textSizes } from '../design/typography'
import { mediaUrl } from '../media/mediaUrl'
import { useVideoElement } from '../media/useVideoElement'
import { videoManager } from '../media/VideoManager'
import { BOARD_VIEW_DISTANCE } from './Whiteboard'
import { useBilingual } from '../i18n/localeStore'
import type { Bilingual } from '../i18n/locale'

/** Plays while mounted: a lesson video starts when its step comes up and stops when it leaves. */
function ScreenVideo({ step, width }: { step: LessonVideoDef; width: number }) {
  const size = textSizes(BOARD_VIEW_DISTANCE)
  const say = useBilingual()
  const caption = say(step.title)
  const { video, texture } = useVideoElement(mediaUrl(step.src), step.loop)
  useEffect(() => {
    videoManager.play(video).catch((err: unknown) => {
      // Our own cleanup pausing a pending play() (step changed, or StrictMode's remount) is not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error(`lesson video "${step.id}" failed to play (${step.src})`, err)
    })
    return () => videoManager.pause(video)
  }, [video, step.id, step.src])
  const w = Math.min(width, 2 * step.aspect * 0.95)
  const h = w / step.aspect
  return (
    <group>
      <mesh>
        <planeGeometry args={[w, h]} />
        {/* Unlit and untone-mapped: the video should look exactly as encoded. */}
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* What is playing, in writing: sound may be off, or the student may not hear it. */}
      <Text
        font={fontUrls.regular}
        fontSize={size.body * 0.8}
        color={palette.murekkep}
        anchorX="center"
        anchorY="top"
        maxWidth={w}
        textAlign="center"
        position={[0, -h / 2 - 0.08, 0.002]}
      >
        {captionText(caption)}
      </Text>
    </group>
  )
}

/** Both languages of a short caption, one per line. */
function captionText(b: Bilingual): string {
  return b.secondary ? `${b.primary}\n${b.secondary}` : b.primary
}

/** The projection screen: the current video, or the section's title slide between videos. */
export function ProjectionScreen({
  area,
  content,
  title,
}: {
  area: WallArea
  content: ScreenContent
  title: Bilingual
}) {
  const width = area.u1 - area.u0
  const size = textSizes(BOARD_VIEW_DISTANCE)
  const say = useBilingual()
  if (content.kind === 'video')
    return <ScreenVideo key={content.step.id} step={content.step} width={width} />
  const section = say(content.section.title)
  return (
    <group>
      <Text
        font={fontUrls.bold}
        fontSize={size.title}
        color={palette.murekkep}
        anchorY="bottom"
        maxWidth={width - 0.3}
        textAlign="center"
        position-y={section.secondary ? size.body * 1.5 : 0}
      >
        {section.primary}
      </Text>
      {section.secondary && (
        <Text
          font={fontUrls.regular}
          fontSize={size.body}
          color={palette.murekkep}
          anchorY="bottom"
          maxWidth={width - 0.3}
          textAlign="center"
          position-y={0.02}
        >
          {section.secondary}
        </Text>
      )}
      <mesh position-y={-0.08}>
        <planeGeometry args={[0.6, 0.02]} />
        <meshBasicMaterial color={palette.kolostrum} />
      </mesh>
      <Text
        font={fontUrls.regular}
        fontSize={size.body}
        lineHeight={1.3}
        color={palette.murekkep}
        anchorY="top"
        textAlign="center"
        position-y={-0.16}
      >
        {captionText(title)}
      </Text>
    </group>
  )
}
