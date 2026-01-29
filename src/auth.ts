import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { prisma } from './lib/db/prisma'
import { type EnvVars, env } from './server/env'
import { type AppDb } from './server/types'

const UserId = z.string().brand<'UserId'>().default(nanoid)
type UserId = z.infer<typeof UserId>

export const createAuth = (env: EnvVars, db: AppDb) =>
  betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    plugins: [admin()],
    database: prismaAdapter(db, {
      provider: 'postgresql',
    }),
  })

export const auth = createAuth(env(), prisma)

export type Auth = ReturnType<typeof createAuth>
export type Session = Auth['$Infer']['Session']['session']
export type User = Omit<Auth['$Infer']['Session']['user'], 'id'> & {
  id: UserId
}
