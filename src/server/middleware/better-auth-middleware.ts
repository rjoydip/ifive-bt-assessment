import { createMiddleware } from 'hono/factory'
import { createAuth, User } from '~/lib/auth'
import { cacheGlobal } from '~/lib/cacheGlobal'
import { AppBindings } from '~/server/types'

export const betterAuthMiddleware = createMiddleware<AppBindings>(
  async (c, next) => {
    const auth = cacheGlobal('auth', () => createAuth(c.env, c.var.db))
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    c.set('auth', auth)

    if (!session) {
      c.set('user', null)
      c.set('session', null)
      return next()
    }

    c.set('session', session.session)
    c.set('user', session.user as User)

    await next()
  },
)
