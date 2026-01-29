import { createMiddleware } from 'hono/factory'
import { prisma } from '~/lib/db/prisma'
import { AppBindings } from '~/server/types'

export const dbMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  const db = prisma
  c.set('db', db)
  await next()
})
