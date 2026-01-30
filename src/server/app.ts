/**
 * Main Hono Application
 * Entry point for Leave Management API
 */
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { logger } from 'hono/logger'
import { z } from 'zod'
import leaveRoutes from './api/leave'
import { betterAuthMiddleware } from './middleware/better-auth-middleware'
import { dbMiddleware } from './middleware/db-middleware'
import { envMiddleware } from './middleware/env-middleware'
import { logMiddleware } from './middleware/log-middleware'
import serveEmojiFavicon from './middleware/serve-emoji-favicon'
import { AppBindings } from './types'

export const emojiIcon = import.meta.env.DEV ? '💧' : '🔥'

const querySchema = z.object({
  roles: z.string().optional(), // comma-separated roles
  includeBanned: z.string().optional(), // true/false
  q: z.string().optional(), // search query
})
const app = new Hono<AppBindings>({ strict: false })

app.use(envMiddleware)
app.use(logMiddleware)
app.use(dbMiddleware)
app.use(betterAuthMiddleware)
app.use(serveEmojiFavicon(emojiIcon))

// Error handling middleware
app.onError((err, c) => {
  console.error(`Error: ${err.message}`)
  return c.json(
    {
      success: false,
      error: err.message || 'Internal Server Error',
    },
    500,
  )
})

app.use((c, next) => {
  if (c.req.path.startsWith('/api')) return next()
  return serveStatic({ path: './dist/public/index.html' })(c, next)
})

if (import.meta.env.DEV) {
  app.use(logger())
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api', (c) => {
  return c.json({
    status: 'ok',
    message: 'Leave Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// Mount auth management routes (Better Auth)
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = c.get('auth')
  return auth.handler(c.req.raw)
})

// Mount leave management routes
app.route('/api/leave', leaveRoutes)

app.get('/api/users', async (c) => {
  const db = c.get('db')

  /* ---------------- parse query ---------------- */
  const parsed = querySchema.safeParse(c.req.query())

  if (!parsed.success) {
    return c.json({ message: 'Invalid query params' }, 400)
  }

  const { roles, includeBanned, q } = parsed.data

  /* ---------------- defaults ---------------- */
  const roleList = roles?.split(',').map((r) => r.trim()) ?? ['admin', 'user'] // default

  const showBanned = includeBanned === 'true'

  /* ---------------- prisma filter ---------------- */
  const users = await db.user.findMany({
    where: {
      role: {
        in: roleList,
      },
      ...(showBanned ? {} : { banned: false }),
      ...(q
        ? {
            name: {
              contains: q,
              mode: 'insensitive', // case-insensitive search
            },
          }
        : {}),
    },
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      emailVerified: true,
      image: true,
      banExpires: true,
      banned: true,
      banReason: true,
    },
  })

  return c.json(
    {
      data: users,
      meta: {
        count: users.length,
        roles: roleList,
        includeBanned: showBanned,
        search: q ?? null,
      },
    },
    200,
  )
})

// Health endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Route not found',
    },
    404,
  )
})

if (import.meta.env.PROD) {
  // IDK why this doens't work in dev
  app.use(compress())
}

export default app
