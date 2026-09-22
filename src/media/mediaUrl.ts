const base: unknown = import.meta.env.VITE_MEDIA_BASE_URL

/** Resolves a manifest media key (e.g. "videos/x.4f2a9c1e.mp4") to a fetchable URL. */
export function mediaUrl(key: string): string {
  if (typeof base !== 'string' || base.length === 0) {
    throw new Error(
      'VITE_MEDIA_BASE_URL is not set. Define it in .env.development (dev) or the Pages build env (prod).',
    )
  }
  return base.endsWith('/') ? `${base}${key}` : `${base}/${key}`
}
