# Quick Start Guide - Leave Management API (Hono.js)

## 🚀 Setup Instructions

### 1. Create Project

```bash
mkdir leave-management-api
cd leave-management-api
```

### 2. Initialize Project

```bash
npm init -y
```

Copy the provided `package.json` content.

### 3. Install Dependencies

```bash
bun install hono @hono/node-server @hono/zod-validator @prisma/client zod
bun install -D @types/node prisma tsx typescript
```

### 4. Setup Prisma

```bash
bunx prisma init
```

Copy the provided `schema.prisma` to `prisma/schema.prisma`

### 5. Configure Database

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/leave_db"
BETTER_AUTH_SECRET="http://localhost:3000"
```

### 6. Push Schema to Database

```bash
bunx prisma db push
bunx prisma generate
```

### 7. Create Source Files

Create the directory structure:

```bash
mkdir src
```

Copy the provided files:

- `src/app.ts` - Main application
- `src/leave-api.ts` - API routes
- `src/server.ts` - Server entry point

### 8. Run Development Server

```bash
bun run dev
```

Server will start at `http://localhost:3000`

---

## 🔧 Configuration

### Environment Variables

Create `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/leave_db"

# Server
PORT=3000
NODE_ENV=development

# CORS
BETTER_AUTH_SECRET="http://localhost:3000"
```

Create `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/leave_db"
PORT=3000
BETTER_AUTH_SECRET="http://localhost:3000"
```

---

## 🎯 Quick API Tests

### 1. Admin Posts Credits

```bash
curl -X POST http://localhost:3000/api/leave/credits \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [],
    "credits": 16,
    "hoursPerDay": 8,
    "expiresAt": "2025-06-01T00:00:00.000Z"
  }'
```

### 2. User Creates Leave Request

```bash
curl -X POST http://localhost:3000/api/leave/requests \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-03-01T00:00:00.000Z",
    "endDate": "2025-03-03T00:00:00.000Z",
    "hoursPerDay": 8,
    "reason": "Vacation"
  }'
```

### 3. Check Balance

```bash
curl http://localhost:3000/api/leave/balance
```

### 4. Process Expired Credits

```bash
curl -X POST http://localhost:3000/api/leave/expire
```

---

## 📊 Database Management

### View Database

```bash
bunx prisma studio
```

### Create Migration

```bash
bunx prisma migrate dev --name initial
```

### Reset Database

```bash
bunx prisma migrate reset
```

### Seed Database (Optional)

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
    },
  })

  // Create admin
  const admin = await prisma.user.create({
    data: {
      id: 'admin_123',
      name: 'Admin User',
      email: 'admin@example.com',
      emailVerified: true,
      role: 'admin',
    },
  })

  console.log('✅ Seed completed', { user, admin })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Run seed:

```bash
bun run db:seed
```

---

## 🚀 Deploy to Cloudflare Workers

Install Wrangler:

```bash
bun install -D wrangler
```

Create `wrangler.toml`:

```toml
name = "leave-management-api"
main = "src/server.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
```

Deploy:

```bash
bunx wrangler deploy
```

---

## 📈 Monitoring

### Add Logging

```bash
bun install pino pino-pretty
```

```typescript
import { logger } from 'hono/logger'

app.use('*', logger())
```

---

## 🆘 Troubleshooting

### Port already in use

```bash
# Change port in .env
PORT=3001
```

### Database connection error

```bash
# Check DATABASE_URL in .env
# Ensure database is running
```

### Prisma generate error

```bash
bunx prisma generate --force
```
