import { Container, Text, useTTF } from '@react-three/uikit'
import { palette } from '../design/tokens'
import { fontUrls, uikitCharset } from '../design/typography'

const SAMPLE = 'ĞÜŞİÖÇ ğüşıöç — Sonraki'

// Module-level so its identity is stable: useTTF caches by input, and a fresh array per render
// restarts MSDF generation forever (seen as a Wasm out-of-memory loop).
const ATKINSON_TTF = [{ url: fontUrls.semibold, charset: uikitCharset, fixOverlaps: true }]

/**
 * Faz 0 check that uikit (VR menus) renders Turkish glyphs, comparing uikit's bundled Inter
 * with Atkinson Hyperlegible Next converted to MSDF at runtime from the TTF.
 */
export function UikitFontTest() {
  // The generator returns a ready font-family map keyed by the TTF's own family name.
  const atkinson = useTTF(ATKINSON_TTF)
  const family = Object.keys(atkinson)[0]
  if (!family) throw new Error(`useTTF returned no font family for ${fontUrls.semibold}`)
  return (
    <Container
      pixelSize={0.002}
      flexDirection="column"
      gap={16}
      padding={32}
      borderRadius={16}
      backgroundColor={palette.onsut}
      fontFamilies={atkinson}
    >
      <Text color={palette.murekkep} fontSize={40}>
        {`uikit Inter: ${SAMPLE}`}
      </Text>
      <Text color={palette.murekkep} fontSize={40} fontFamily={family}>
        {`uikit Atkinson: ${SAMPLE}`}
      </Text>
    </Container>
  )
}
