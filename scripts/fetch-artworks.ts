// Downloads the public-domain paintings used as virtual artworks, after checking each file's
// licence on Wikimedia Commons. Keeps the downloaded JPEGs in content/media/raw/artworks, writes
// GPU-compressed KTX2 copies to content/media/dist/artworks (both gitignored; needs ffmpeg) and
// credits + aspect ratios to content/media/artworks.json (in git), which museum.json relies on.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { encodeKtx2 } from './lib/ktx2.ts'

type Artwork = { slug: string; file: string; title: string; artist: string; year: string }

const ARTWORKS: Artwork[] = [
  {
    slug: 'cassatt-mother-and-child',
    file: 'Mary Cassatt - Mother and Child - Google Art Project.jpg',
    title: 'Anne ve Çocuk',
    artist: 'Mary Cassatt',
    year: '1884–1894',
  },
  {
    slug: 'cassatt-maternal-caress',
    file: 'Mary Cassatt, Maternal Caress, c. 1891, NGA 1068.jpg',
    title: 'Anne Şefkati',
    artist: 'Mary Cassatt',
    year: 'y. 1891',
  },
  {
    slug: 'morisot-the-cradle',
    file: 'Berthe Morisot - The Cradle - Google Art Project.jpg',
    title: 'Beşik',
    artist: 'Berthe Morisot',
    year: '1872',
  },
  {
    slug: 'renoir-mother-nursing',
    file: 'Pierre-Auguste Renoir - Mother nursing her child.jpg',
    title: 'Çocuğunu Emziren Anne',
    artist: 'Pierre-Auguste Renoir',
    year: '1885',
  },
  {
    slug: 'cassatt-mother-feeding-child',
    file: 'Mother Feeding Child MET DT5263.jpg',
    title: 'Çocuğunu Besleyen Anne',
    artist: 'Mary Cassatt',
    year: '1898',
  },
  {
    slug: 'cassatt-woman-with-child',
    file: 'Mary Cassatt - Woman Sitting with a Child in Her Arms - Google Art Project.jpg',
    title: 'Kucağında Çocukla Oturan Kadın',
    artist: 'Mary Cassatt',
    year: 'y. 1890',
  },
  {
    slug: 'cassatt-breakfast-in-bed',
    file: 'Breakfast in Bed (1897) by Mary Cassatt, Huntington Library.jpg',
    title: 'Yatakta Kahvaltı',
    artist: 'Mary Cassatt',
    year: '1897',
  },
  {
    slug: 'cassatt-susan-comforting',
    file: 'Mary Cassatt - Susan Comforting the Baby - Google Art Project.jpg',
    title: 'Bebeği Avutan Susan',
    artist: 'Mary Cassatt',
    year: '1881',
  },
  {
    slug: 'cassatt-sleepy-child',
    file: 'Mary Cassatt - Mother About to Wash Her Sleepy Child - Google Art Project.jpg',
    title: 'Uykulu Çocuğunu Yıkamaya Hazırlanan Anne',
    artist: 'Mary Cassatt',
    year: '1880',
  },
]

// Quest texture budget (PLAN §11): ~1280 px on the long edge keeps a room of paintings well under
// 100 MB of GPU memory. Wikimedia only serves a fixed set of thumbnail widths, so pick from those.
const THUMB_WIDTHS = [960, 1280] as const
const LONG_EDGE = 1280
const ALLOWED_LICENCES = new Set(['Public domain', 'CC0'])
const RAW_DIR = 'content/media/raw/artworks'
// Wikimedia asks anonymous clients to stay well under its rate limit.
const REQUEST_GAP_MS = 2000
const pause = () => new Promise((r) => setTimeout(r, REQUEST_GAP_MS))
const UA = {
  'User-Agent': 'EmzirmeMuzesi/0.1 (educational hospital museum; fetch-artworks script)',
}

type ImageInfo = {
  width: number
  height: number
  url: string
  descriptionurl: string
  extmetadata?: Record<string, { value: string }>
}
type Page = { title: string; missing?: string; imageinfo?: ImageInfo[] }

/** One batched query for all files: licence, size and original URL. */
async function imageInfos(files: string[]): Promise<Map<string, ImageInfo>> {
  const params = new URLSearchParams({
    action: 'query',
    titles: files.map((f) => `File:${f}`).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiextmetadatafilter: 'LicenseShortName',
    format: 'json',
    formatversion: '2',
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA })
  if (!res.ok) throw new Error(`Commons API ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as {
    query?: { pages?: Page[]; normalized?: { from: string; to: string }[] }
  }
  const byTitle = new Map((body.query?.pages ?? []).map((p) => [p.title, p]))
  const normalized = new Map((body.query?.normalized ?? []).map((n) => [n.from, n.to]))
  const out = new Map<string, ImageInfo>()
  for (const f of files) {
    const title = normalized.get(`File:${f}`) ?? `File:${f}`
    const info = byTitle.get(title)?.imageinfo?.[0]
    if (!info) throw new Error(`Commons has no file "${f}": ${JSON.stringify(byTitle.get(title))}`)
    out.set(f, info)
  }
  return out
}

/** Standard Commons thumbnail URL: /commons/a/ab/Name.jpg -> /commons/thumb/a/ab/Name.jpg/960px-Name.jpg */
function thumbUrl(originalUrl: string, width: number): string {
  // imageinfo URLs carry tracking query parameters; the thumb path must be built from the bare path.
  const bare = originalUrl.split('?')[0] ?? originalUrl
  const m = bare.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(.+)\/([^/]+)$/)
  if (!m) throw new Error(`unexpected Commons file URL: ${originalUrl}`)
  return `${m[1]}/thumb/${m[2]}/${m[3]}/${width}px-${m[3]}`
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true })
  const infos = await imageInfos(ARTWORKS.map((a) => a.file))
  const credits = []
  for (const a of ARTWORKS) {
    const info = infos.get(a.file)
    if (!info) throw new Error(`missing info for "${a.file}"`)
    const licence = info.extmetadata?.LicenseShortName?.value ?? ''
    if (!ALLOWED_LICENCES.has(licence)) {
      throw new Error(
        `"${a.file}" is licensed "${licence}"; only ${[...ALLOWED_LICENCES].join(', ')} are allowed`,
      )
    }
    const aspect = info.width / info.height
    const wanted = aspect >= 1 ? LONG_EDGE : LONG_EDGE * aspect
    const width: number = THUMB_WIDTHS.find((w) => w >= wanted) ?? LONG_EDGE
    const key = `artworks/${a.slug}.ktx2`
    const rawPath = `${RAW_DIR}/${a.slug}.jpg`
    const distPath = `content/media/dist/${key}`
    if (existsSync(rawPath)) {
      console.log(`${rawPath}  already present`)
    } else {
      await pause()
      // Originals smaller than the thumbnail width cannot be upscaled by Commons; take them as-is.
      const url =
        info.width > width ? thumbUrl(info.url, width) : (info.url.split('?')[0] ?? info.url)
      const img = await fetch(url, { headers: UA })
      if (!img.ok) throw new Error(`download ${img.status} for ${url}: ${await img.text()}`)
      writeFileSync(rawPath, Buffer.from(await img.arrayBuffer()))
      console.log(`${rawPath}  ${Math.min(width, info.width)}px  ${licence}`)
    }
    if (existsSync(distPath)) {
      console.log(`${key}  already present`)
    } else {
      // Paintings are looked at closely: UASTC keeps brushwork that ETC1S would smear.
      const out = await encodeKtx2(rawPath, distPath, 'detail')
      console.log(`${key}  ${out.width}×${out.height}  ${(out.bytes / 1e6).toFixed(1)} MB`)
    }
    credits.push({
      key,
      title: a.title,
      artist: a.artist,
      year: a.year,
      aspect: Number(aspect.toFixed(4)),
      licence,
      source: info.descriptionurl,
    })
  }
  writeFileSync('content/media/artworks.json', JSON.stringify(credits, null, 2) + '\n')
  console.log(`wrote content/media/artworks.json (${credits.length} artworks)`)
}

await main()
