import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { logger } from 'hono/logger'
import { betterAuthMiddleware } from './middleware/better-auth-middleware'
import { dbMiddleware } from './middleware/db-middleware'
import { envMiddleware } from './middleware/env-middleware'
import { logMiddleware } from './middleware/log-middleware'
import serveEmojiFavicon from './middleware/serve-emoji-favicon'
import { AppBindings } from './types'

export const emojiIcon = import.meta.env.DEV ? '💧' : '🔥'

const app = new Hono<AppBindings>({ strict: false })

app.use(envMiddleware)
app.use(logMiddleware)
app.use(dbMiddleware)
app.use(betterAuthMiddleware)
app.use(serveEmojiFavicon(emojiIcon))

app.use((c, next) => {
  if (c.req.path.startsWith('/api')) return next()
  return serveStatic({ path: './dist/public/index.html' })(c, next)
})

if (import.meta.env.DEV) {
  app.use(logger())
}

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = c.get('auth')
  return auth.handler(c.req.raw)
})

app.get('/api/users', async (c) => {
  const db = c.get('db')
  const users = await db.user.findMany()

  return c.json(
    {
      data: users,
    },
    200,
  )
})

if (import.meta.env.PROD) {
  // IDK why this doens't work in dev
  app.use(compress())
}

export default app
