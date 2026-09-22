// Shared KTX2 encoding for the media scripts. ffmpeg decodes (and optionally resizes) the source
// into raw RGBA, the Basis Universal WASM encoder turns that into a GPU-compressed KTX2 file.
// On Quest the browser transcodes it to ASTC/ETC2, so textures stay compressed in GPU memory
// (a 4096×2048 JPEG is ~45 MB once uploaded; the same panorama as KTX2 is 4–11 MB).
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { encodeToKTX2 } from 'ktx2-encoder'

/**
 * `detail`: UASTC, near-lossless, for paintings and anything seen up close.
 * `backdrop`: ETC1S, ~4× smaller file, softer; fine for surfaces seen at a distance.
 * `data`: UASTC in linear space, for roughness/metalness/AO maps (not colours).
 * `normal`: UASTC tuned for normal maps, linear.
 */
export type Ktx2Mode = 'detail' | 'backdrop' | 'data' | 'normal'

function probeSize(input: string): { width: number; height: number } {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'csv=p=0',
      input,
    ],
    { encoding: 'utf8' },
  ).trim()
  const [w, h] = out.split(',').map(Number)
  if (!w || !h) throw new Error(`ffprobe could not read the size of ${input}: "${out}"`)
  return { width: w, height: h }
}

// Block-compressed formats (BC7 on desktop) need both sides to be a multiple of 4; trimming
// at most 3 px keeps the aspect ratio intact to well under 1 %.
const floor4 = (n: number) => n - (n % 4)

/** Decodes `input` to RGBA at `width` (keeps aspect; defaults to the source width). */
function decodeRgba(input: string, width?: number) {
  const src = probeSize(input)
  const w = floor4(width ?? src.width)
  const h = floor4(Math.round((w / src.width) * src.height))
  const data = execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      input,
      '-vf',
      `scale=${w}:${h}:flags=lanczos`,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-',
    ],
    { maxBuffer: w * h * 4 + 1024 },
  )
  if (data.length !== w * h * 4) {
    throw new Error(`ffmpeg returned ${data.length} bytes for ${input}, expected ${w * h * 4}`)
  }
  return { width: w, height: h, data: new Uint8Array(data.buffer, data.byteOffset, data.length) }
}

export async function encodeKtx2(
  input: string,
  output: string,
  mode: Ktx2Mode,
  { width, flipY = true }: { width?: number; flipY?: boolean } = {},
): Promise<{ width: number; height: number; bytes: number }> {
  const raw = decodeRgba(input, width)
  const uastc = mode !== 'backdrop'
  const colour = mode === 'detail' || mode === 'backdrop'
  const ktx2 = await encodeToKTX2(new Uint8Array(0), {
    imageDecoder: () => Promise.resolve(raw),
    isUASTC: uastc,
    // UASTC: RDO + zstd shrink the file ~2× with no visible loss; ETC1S at quality 200 of 255.
    // RDO is skipped on normal maps, where its error shows up as faceted shading.
    enableRDO: uastc && mode !== 'normal',
    rdoQualityLevel: 1,
    needSupercompression: uastc,
    isNormalMap: mode === 'normal',
    uastcLDRQualityLevel: 2,
    qualityLevel: 200,
    compressionLevel: 2,
    generateMipmap: true,
    isPerceptual: colour,
    isSetKTX2SRGBTransferFunc: colour,
    // Compressed textures cannot be flipped on upload (flipY is ignored), so plain textures are
    // flipped here. glTF textures must not be: glTF puts the UV origin at the top-left already.
    isYFlip: flipY,
    isKTX2File: true,
  })
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, ktx2)
  return { width: raw.width, height: raw.height, bytes: ktx2.length }
}
