import { useEffect } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import type { CompressedTexture, WebGLRenderer } from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

let shared: KTX2Loader | undefined

/**
 * The one KTX2Loader for the app: each instance spins up its own transcoder workers, so paintings,
 * floors and glTF props all share this one. It needs the renderer to pick ASTC/ETC2/BC7.
 */
export function ktx2Loader(gl: WebGLRenderer): KTX2Loader {
  // No transcoder path on purpose: the loader then resolves basis_transcoder.{js,wasm} next to
  // itself and Vite bundles them, so they are local (the hospital network may be offline, PLAN
  // §3.3) and always match the loader's version.
  if (!shared) shared = new KTX2Loader().detectSupport(gl)
  return shared
}

/**
 * Loads a KTX2 (Basis Universal) texture. It stays block-compressed on the GPU (ASTC/ETC2 on
 * Quest), roughly a quarter of the memory of the same image as JPEG. Colour space comes from the
 * file itself (the media scripts write sRGB), and the image is pre-flipped at encode time.
 */
export function useKTX2(
  url: string,
  configure?: (t: CompressedTexture) => void,
): CompressedTexture {
  const gl = useThree((s) => s.gl)
  const texture = useLoader(ktx2Loader(gl), url)
  if (configure) configure(texture)
  // Upload now instead of on first draw, so walking into a room does not hitch on texture upload.
  useEffect(() => gl.initTexture(texture), [gl, texture])
  return texture
}
