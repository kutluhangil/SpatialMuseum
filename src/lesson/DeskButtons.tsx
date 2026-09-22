import { useState } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { palette } from '../design/tokens'
import { fontUrls } from '../design/typography'
import { useLessonStore } from './lessonStore'
import { useUI } from '../i18n/strings'

// 16 × 7 cm at ~0.6 m from a seated eye: well over the 44 px touch-target equivalent.
const BUTTON = { w: 0.16, h: 0.07 }
const LABEL = 0.022

function DeskButton({
  x,
  label,
  onPress,
  disabled,
}: {
  x: number
  label: string
  onPress: () => void
  disabled: boolean
}) {
  const [hover, setHover] = useState(false)
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!disabled) onPress()
  }
  return (
    <group position-x={x}>
      {/* Visible focus: a kolostrum ring appears around the hovered/pointed button. */}
      {hover && !disabled && (
        <mesh position-z={-0.001}>
          <planeGeometry args={[BUTTON.w + 0.012, BUTTON.h + 0.012]} />
          <meshBasicMaterial color={palette.kolostrum} />
        </mesh>
      )}
      <mesh
        onClick={click}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <planeGeometry args={[BUTTON.w, BUTTON.h]} />
        <meshBasicMaterial color={disabled ? palette.korumaBandi : palette.onsut} />
      </mesh>
      <Text
        font={fontUrls.semibold}
        fontSize={LABEL}
        color={palette.murekkep}
        position-z={0.001}
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

/** Previous / Next on a small stand on the visitor's desk, tilted towards a seated eye. */
export function DeskButtons({ count }: { count: number }) {
  const t = useUI()
  const index = useLessonStore((s) => s.index)
  const go = useLessonStore((s) => s.go)
  return (
    <group rotation-x={-Math.PI / 4}>
      <mesh position-z={-0.004}>
        <planeGeometry args={[0.42, 0.11]} />
        <meshBasicMaterial color={palette.murekkep} />
      </mesh>
      <DeskButton x={-0.095} label={t('previous')} onPress={() => go(-1)} disabled={index === 0} />
      <DeskButton
        x={0.095}
        label={t('next')}
        onPress={() => go(1)}
        disabled={index === count - 1}
      />
    </group>
  )
}
