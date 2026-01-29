import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '~/lib/db/generated/client'
import { env } from '~/server/env'

const adapter = new PrismaNeon({
  connectionString: env().DATABASE_URL,
})
export const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
