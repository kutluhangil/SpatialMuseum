import type { Plugin } from 'vite'
import sirv from 'sirv'

// Serves encoded media from content/media/dist at /media/ during development, so the
// viewer resolves media exactly like production (VITE_MEDIA_BASE_URL + manifest key).
// sirv answers Range requests, which video seeking depends on.
export function mediaDevServer(): Plugin {
  return {
    name: 'media-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/media', sirv('content/media/dist', { dev: true }))
    },
  }
}
