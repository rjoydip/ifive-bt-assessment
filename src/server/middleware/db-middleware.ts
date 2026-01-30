import { createMiddleware } from 'hono/factory'
import { cacheGlobal } from '~/lib/cacheGlobal'
import { prisma } from '~/lib/db/prisma'
import { AppBindings } from '~/server/types'

export const dbMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  const db = cacheGlobal('db', () => prisma)
  c.set('db', db)
  await next()
})
