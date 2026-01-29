import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '~/server/env'
import { PrismaClient } from './generated/client'

const adapter = new PrismaPg({
  connectionString: env().DATABASE_URL,
})

export const prisma = new PrismaClient({ adapter })
