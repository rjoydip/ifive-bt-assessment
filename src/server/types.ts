import { Hono } from 'hono'
import { Logger } from 'pino'
import type { Auth, Session, User } from '~/auth'
import type { prisma } from '~/lib/db/prisma'
import { EnvVars } from './env'

export type AppDb = typeof prisma

export interface AppBindings {
  Bindings: EnvVars
  Variables: {
    auth: Auth
    db: AppDb
    log: Logger
    session: Session | null
    user: User | null
  }
}

export type AppOpenAPI = Hono<AppBindings>
