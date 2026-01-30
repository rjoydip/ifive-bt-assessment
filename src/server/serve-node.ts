/**
 * Server Entry Points
 * Multiple runtime options: Node.js, Bun, Cloudflare Workers
 */
import { serve } from '@hono/node-server'
import app, { emojiIcon } from './app'
import { env } from './env'

const e = env()

// ============================================
// FOR NODE.JS / BUN
// ============================================
serve({ fetch: app.fetch, port: e.PORT }, ({ port }) => {
  console.log(`${emojiIcon} Server running at http://localhost:${port}`)
})
