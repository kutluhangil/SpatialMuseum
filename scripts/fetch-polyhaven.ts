// Fetches the CC0 Poly Haven assets the classroom ships in public/: the floor texture (AO baked
// into the diffuse) and the outdoor panorama seen through windows. Needs ffmpeg.
// Textures ship as KTX2 (scripts/lib/ktx2.ts); only the compressed result lands in public/.
// Re-running is safe: finished files are skipped.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { encodeKtx2 } from './lib/ktx2.ts'

const API = 'https://api.polyhaven.com'
const UA = {
  'User-Agent': 'EmzirmeMuzesi/0.1 (educational hospital museum; fetch-polyhaven script)',
}

const PANORAMA = { id: 'meadow_2', out: 'public/textures/panorama-meadow-4k.ktx2', width: 4096 }
// Speckled beige ceramic tiles: the hard-wearing, light floor of Turkish university classrooms.
const FLOOR = { id: 'interior_tiles', out: 'public/textures/floor-interior-tiles-2k.ktx2' }

type FileEntry = { url: string; size: number; include?: Record<string, { url: string }> }

async function json<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: UA })
  if (!res.ok) throw new Error(`Poly Haven API ${res.status} for ${path}: ${await res.text()}`)
  return (await res.json()) as T
}

async function download(url: string, to: string) {
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`download ${res.status} for ${url}`)
  mkdirSync(dirname(to), { recursive: true })
  writeFileSync(to, Buffer.from(await res.arrayBuffer()))
}

function ffmpeg(args: string[]) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
}

async function assertCC0(id: string) {
  // Poly Haven publishes everything as CC0; fail loudly if an asset ever says otherwise.
  const info = await json<{ license?: string; name?: string }>(`/info/${id}`)
  if (info.license !== undefined && !/cc0/i.test(info.license)) {
    throw new Error(`${id} is licensed "${info.license}", expected CC0`)
  }
}

async function floor() {
  if (existsSync(FLOOR.out)) return console.log(`${FLOOR.out}  already present`)
  await assertCC0(FLOOR.id)
  const files = await json<Record<string, Record<string, Record<string, FileEntry>>>>(
    `/files/${FLOOR.id}`,
  )
  const diff = files.Diffuse?.['2k']?.jpg?.url
  const ao = files.AO?.['2k']?.jpg?.url
  if (!diff || !ao) throw new Error(`${FLOOR.id}: 2k Diffuse/AO jpg not listed`)
  const tmp = join(tmpdir(), `floor-${process.pid}`)
  mkdirSync(tmp, { recursive: true })
  await download(diff, join(tmp, 'diff.jpg'))
  await download(ao, join(tmp, 'ao.jpg'))
  // Multiply AO into the diffuse so the floor needs a single unlit texture.
  ffmpeg([
    '-i',
    join(tmp, 'diff.jpg'),
    '-i',
    join(tmp, 'ao.jpg'),
    '-filter_complex',
    '[1:v]format=gbrp[ao];[0:v]format=gbrp[d];[d][ao]blend=all_mode=multiply,format=yuvj444p',
    '-q:v',
    '2',
    join(tmp, 'floor.jpg'),
  ])
  // ETC1S: the floor is seen at grazing angles, where UASTC's extra detail is lost; a sixth of the size.
  await encodeKtx2(join(tmp, 'floor.jpg'), FLOOR.out, 'backdrop')
  rmSync(tmp, { recursive: true, force: true })
  console.log(`${FLOOR.out}  written`)
}

async function panorama() {
  if (existsSync(PANORAMA.out)) return console.log(`${PANORAMA.out}  already present`)
  await assertCC0(PANORAMA.id)
  const files = await json<{ tonemapped?: FileEntry }>(`/files/${PANORAMA.id}`)
  const url = files.tonemapped?.url
  if (!url) throw new Error(`${PANORAMA.id}: no tonemapped JPG listed`)
  const tmp = join(tmpdir(), `pano-${process.pid}.jpg`)
  await download(url, tmp)
  // Seen only through windows, several metres away: ETC1S is plenty and 5× smaller than UASTC.
  await encodeKtx2(tmp, PANORAMA.out, 'backdrop', { width: PANORAMA.width })
  rmSync(tmp, { force: true })
  console.log(`${PANORAMA.out}  written`)
}

await floor()
await panorama()
