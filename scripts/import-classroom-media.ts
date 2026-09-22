// Turns the class's own material in content/media/raw into what the room can show:
//   documents/*.png  -> two KTX2 poster atlases (one draw call each on the wall)
//   videos/*.mov     -> H.264 MP4 (Quest Browser decodes it everywhere) plus a poster frame
// Sources stay in content/media/raw, results land in content/media/dist; neither is in git.
// Needs ffmpeg. Re-running is safe: finished files are skipped unless --force is passed.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { encodeKtx2 } from './lib/ktx2.ts'

const RAW_DOCS = 'content/media/raw/documents'
const RAW_VIDEOS = 'content/media/raw/videos'
const DIST = 'content/media/dist'
const MANIFEST = 'content/media/documents.json'

const FORCE = process.argv.includes('--force')

/** Poster cell size in the atlas; the sources are 724 × 1024 (A4), so this is one to one. */
const CELL = { width: 724, height: 1024 }
const ATLAS = { columns: 3, rows: 4 }
const PER_ATLAS = ATLAS.columns * ATLAS.rows

// Posters were drawn as artwork on a transparent background: some are dark ink meant for white
// paper, some are white ink meant for a dark board. Flattening them all onto white would make half
// of them invisible, so the backdrop is chosen from how bright the drawn pixels are.
const LIGHT_INK_THRESHOLD = 0.7
const BACKDROP = { paper: '#FFFFFF', board: '#141618' }

type Poster = { file: string; slug: string; title: string; group: string }

/**
 * The class's posters in teaching order: how milk is made, then positions, then what a mother asks
 * in the first weeks, then expressing and storing milk. The file names are the students' own.
 */
const POSTERS: Poster[] = [
  {
    file: 'helin.png',
    slug: 'anne-sutu-neden-onemli',
    title: 'Anne sütü bebekler için neden önemlidir?',
    group: 'Anne sütü',
  },
  {
    file: 'yeliz.png',
    slug: 'emzirmek-anne-sagligi',
    title: 'Emzirmek anne sağlığı için neden önemlidir?',
    group: 'Anne sütü',
  },
  {
    file: 'melis.png',
    slug: 'ne-kadar-sure-emzirme',
    title: 'Bebek ne kadar süre emzirilmelidir?',
    group: 'Anne sütü',
  },
  {
    file: 'ecem.png',
    slug: 'anne-sutunun-rengi',
    title: 'Anne sütünün rengi nasıl olmalıdır?',
    group: 'Anne sütü',
  },
  {
    file: 'ecem 2.png',
    slug: 'su-ve-ek-gida',
    title: 'Emzirmenin yanında su ya da başka besinler?',
    group: 'Anne sütü',
  },
  {
    file: 'gizem.png',
    slug: 'bebegin-midesi',
    title: 'Bebeğin midesinin büyüklüğü ne kadardır?',
    group: 'Anne sütü',
  },
  {
    file: 'AYŞENUR 1.png',
    slug: 'sut-nasil-uretilir',
    title: 'Memelerde süt nasıl üretilir?',
    group: 'Süt üretimi',
  },
  {
    file: 'AYŞENUR 2.png',
    slug: 'sut-nasil-akar',
    title: 'Süt memeden nasıl akar?',
    group: 'Süt üretimi',
  },
  {
    file: 'AYŞENUR 3.png',
    slug: 'sut-akma-ipuclari',
    title: 'Sütün aktığını gösteren ipuçları nelerdir?',
    group: 'Süt üretimi',
  },
  {
    file: 'AYŞENUR 4.png',
    slug: 'sut-akmasi-kolaylasir',
    title: 'Sütün akması nasıl kolaylaşır?',
    group: 'Süt üretimi',
  },
  {
    file: 'canan 1.png',
    slug: 'emzirirken-dikkat',
    title: 'Emzirirken dikkat edilmesi gerekenler',
    group: 'Pozisyonlar',
  },
  {
    file: 'canan2.png',
    slug: 'kucaklama-pozisyonu',
    title: 'Kucaklama pozisyonu',
    group: 'Pozisyonlar',
  },
  {
    file: 'canan 3.png',
    slug: 'ters-kucaklama-pozisyonu',
    title: 'Ters kucaklama pozisyonu',
    group: 'Pozisyonlar',
  },
  {
    file: 'canan 4.png',
    slug: 'koltuk-alti-pozisyonu',
    title: 'Koltuk altı pozisyonu',
    group: 'Pozisyonlar',
  },
  {
    file: 'canan 5.png',
    slug: 'yan-yatis-pozisyonu',
    title: 'Yan yatış pozisyonu',
    group: 'Pozisyonlar',
  },
  {
    file: 'canan 6.png',
    slug: 'biyolojik-emzirme',
    title: 'Biyolojik emzirme',
    group: 'Pozisyonlar',
  },
  {
    file: ',,.png',
    slug: 'hangi-durumlarda-sagilir',
    title: 'Hangi durumlarda süt sağılır?',
    group: 'Süt sağma',
  },
  {
    file: 'oda 5.png',
    slug: 'sagmadan-once-hazirlik',
    title: 'Süt sağmadan önce nasıl hazırlık yapmalıyım?',
    group: 'Süt sağma',
  },
  {
    file: 'oda 5..png',
    slug: 'elle-sagma-teknigi',
    title: 'Elle süt sağma tekniği',
    group: 'Süt sağma',
  },
  {
    file: 'oda 5.png......png',
    slug: 'pompa-ile-sagma',
    title: 'Pompa ile süt sağma tekniği',
    group: 'Süt sağma',
  },
  {
    file: 'oda 5.png...png',
    slug: 'enjektorle-sagma',
    title: 'Enjektörle süt sağma tekniği',
    group: 'Süt sağma',
  },
  {
    file: 'oda 5.png.....png',
    slug: 'ne-siklikla-sagma',
    title: 'Ne kadar sıklıkla süt sağmalıyım?',
    group: 'Süt sağma',
  },
  {
    file: 'oda 5.png........png',
    slug: 'anne-sutu-nasil-saklanir',
    title: 'Anne sütü nasıl saklanır?',
    group: 'Süt sağma',
  },
  {
    file: 'oda 5.png,.png',
    slug: 'sagilan-sut-nasil-verilir',
    title: 'Sağılan süt bebeğe nasıl verilir?',
    group: 'Süt sağma',
  },
]

type Video = { file: string; slug: string; title: string }

const VIDEOS: Video[] = [
  { file: '1..mov', slug: 'emzirmeye-hazirlik', title: 'Emzirmeye hazırlık' },
  { file: '2..mov', slug: 'emzirme-pozisyonlari', title: 'Emzirme pozisyonları' },
  { file: '3.mov', slug: 'dogru-kavrama', title: 'Doğru kavrama' },
  { file: '4.mov', slug: 'sut-sagma', title: 'Süt sağma' },
  { file: '5.mov', slug: 'bebek-bakimi', title: 'Bebek bakımı' },
  { file: '6.mov', slug: 'emzirme-sorunlari', title: 'Emzirme sorunları' },
]

function ffmpeg(args: string[]) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
}

/** Mean brightness of the pixels the artist actually drew (alpha > 0.5). */
function inkBrightness(file: string): number {
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
    { encoding: 'buffer', maxBuffer: 1 << 30 },
  )
  let sum = 0
  let drawn = 0
  // Every eighth pixel is plenty for a mean and keeps the script quick.
  for (let i = 0; i < raw.length; i += 32) {
    const a = raw[i + 3] ?? 0
    if (a <= 128) continue
    drawn++
    sum += (0.2126 * (raw[i] ?? 0) + 0.7152 * (raw[i + 1] ?? 0) + 0.0722 * (raw[i + 2] ?? 0)) / 255
  }
  if (drawn === 0) throw new Error(`${file} has no opaque pixels`)
  return sum / drawn
}

function atlasPath(index: number): string {
  return join(DIST, `documents/wall-${index + 1}.ktx2`)
}

async function buildAtlas(posters: Poster[], index: number, tmp: string) {
  const out = atlasPath(index)
  if (!FORCE && existsSync(out)) {
    console.log(`${out}  already present`)
    return
  }
  const cells = posters.map((poster) => {
    const src = join(RAW_DOCS, poster.file)
    const backdrop = inkBrightness(src) > LIGHT_INK_THRESHOLD ? BACKDROP.board : BACKDROP.paper
    const flat = join(tmp, `${poster.slug}.png`)
    // Flatten onto the backdrop the poster was drawn for, and fix the cell size while we are here.
    ffmpeg([
      '-f',
      'lavfi',
      '-i',
      `color=c=${backdrop}:s=${CELL.width}x${CELL.height}`,
      '-i',
      src,
      '-filter_complex',
      `[1:v]scale=${CELL.width}:${CELL.height}:flags=lanczos[p];[0:v][p]overlay=shortest=1,format=rgb24`,
      '-frames:v',
      '1',
      flat,
    ])
    return flat
  })
  const sheet = join(tmp, `atlas-${index}.png`)
  const inputs = cells.flatMap((c) => ['-i', c])
  const layout = cells
    .map(
      (_, i) =>
        `${(i % ATLAS.columns) * CELL.width}_${Math.floor(i / ATLAS.columns) * CELL.height}`,
    )
    .join('|')
  ffmpeg([
    ...inputs,
    '-filter_complex',
    `xstack=inputs=${cells.length}:layout=${layout}:fill=black,format=rgb24`,
    '-frames:v',
    '1',
    sheet,
  ])
  mkdirSync(dirname(out), { recursive: true })
  // UASTC: these are pages of dense text, exactly where ETC1S smears.
  await encodeKtx2(sheet, out, 'detail')
  console.log(`${out}  written (${cells.length} posters)`)
}

function buildVideo(video: Video) {
  const out = join(DIST, `videos/${video.slug}.mp4`)
  const poster = join(DIST, `posters/${video.slug}.jpg`)
  if (!FORCE && existsSync(out) && existsSync(poster)) {
    console.log(`${out}  already present`)
    return
  }
  const src = join(RAW_VIDEOS, video.file)
  mkdirSync(dirname(out), { recursive: true })
  mkdirSync(dirname(poster), { recursive: true })
  // H.264 High profile: HEVC plays on a Quest but not in every browser the museum may be opened in.
  // faststart puts the index first so the video begins before it has finished downloading.
  ffmpeg([
    '-i',
    src,
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-crf',
    '24',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ac',
    '2',
    out,
  ])
  ffmpeg(['-ss', '3', '-i', src, '-frames:v', '1', '-q:v', '3', poster])
  console.log(`${out}  written`)
}

function writeManifest() {
  const entries = POSTERS.map((poster, i) => ({
    slug: poster.slug,
    title: poster.title,
    group: poster.group,
    source: poster.file,
    atlas: `documents/wall-${Math.floor(i / PER_ATLAS) + 1}.ktx2`,
    cell: i % PER_ATLAS,
  }))
  const videos = VIDEOS.map((video) => ({
    slug: video.slug,
    title: video.title,
    source: video.file,
    src: `videos/${video.slug}.mp4`,
    poster: `posters/${video.slug}.jpg`,
  }))
  const manifest = {
    note: 'Written by scripts/import-classroom-media.ts from content/media/raw. Sources belong to the class.',
    atlas: { columns: ATLAS.columns, rows: ATLAS.rows, cell: CELL },
    posters: entries,
    videos,
  }
  const text = `${JSON.stringify(manifest, null, 2)}\n`
  if (!FORCE && existsSync(MANIFEST) && readFileSync(MANIFEST, 'utf8') === text) return
  writeFileSync(MANIFEST, text)
  console.log(`${MANIFEST}  written`)
}

for (const poster of POSTERS) {
  const src = join(RAW_DOCS, poster.file)
  if (!existsSync(src)) throw new Error(`missing poster source: ${src}`)
}
for (const video of VIDEOS) {
  const src = join(RAW_VIDEOS, video.file)
  if (!existsSync(src)) throw new Error(`missing video source: ${src}`)
}

const tmp = join(tmpdir(), `classroom-media-${process.pid}`)
mkdirSync(tmp, { recursive: true })
try {
  for (let i = 0; i * PER_ATLAS < POSTERS.length; i++) {
    await buildAtlas(POSTERS.slice(i * PER_ATLAS, (i + 1) * PER_ATLAS), i, tmp)
  }
  for (const video of VIDEOS) buildVideo(video)
  writeManifest()
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
