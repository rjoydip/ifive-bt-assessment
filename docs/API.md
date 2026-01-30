# Leave Management API - Hono.js

Complete REST API for leave management system with FIFO credit deduction.

## Table of Contents

- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Cron Jobs](#cron-jobs)

> Note: `JWT` bearer tokens are not required at this stage because `JWT authentication` has not yet been implemented in the backend. The APIs are currently secured using the `Better Auth` **session-based** authentication mechanism.

---

## Installation

### 1. Install Dependencies

```bash
bun install hono @hono/node-server @hono/zod-validator zod @prisma/client
bun install -D prisma tsx
```

### 2. Setup Prisma

```bash
bunx prisma init
bunx prisma db push
```

### 3. Start Server

```bash
# Development
bun run dev

# Production
bun run build
bun start
```

---

## API Endpoints

### Base URL

```bash
http://localhost:3000/api/leave
```

---

## 1. Admin Endpoints

### POST /api/leave/credits

**Admin posts leave credits to users**

**Request:**

```bash
curl -X POST http://localhost:3000/api/leave/credits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userIds": ["user1", "user2"],
    "credits": 16,
    "hoursPerDay": 8,
    "expiresAt": "2025-06-01T00:00:00.000Z",
    "notes": "Q2 2025 allocation"
  }'
```

**Apply to all users:**

```bash
curl -X POST http://localhost:3000/api/leave/credits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userIds": [],
    "credits": 16,
    "hoursPerDay": 8,
    "expiresAt": "2025-06-01T00:00:00.000Z",
    "notes": "Company-wide allocation"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Leave credits posted successfully",
  "creditsPosted": 2,
  "totalHours": 32,
  "data": [
    {
      "id": "credit_123",
      "userId": "user1",
      "credits": 16,
      "hoursPerDay": 8,
      "expiresAt": "2025-06-01T00:00:00.000Z",
      "postedAt": "2025-01-30T10:00:00.000Z"
    }
  ]
}
```

### GET /api/leave/admin/requests

**Get all leave requests (Admin only)**

```bash
curl http://localhost:3000/api/leave/admin/requests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**With filters:**

```bash
# Filter by status
curl "http://localhost:3000/api/leave/admin/requests?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by user
curl "http://localhost:3000/api/leave/admin/requests?userId=user_123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "req_123",
      "userId": "user1",
      "startDate": "2025-03-01T00:00:00.000Z",
      "endDate": "2025-03-03T00:00:00.000Z",
      "totalHours": 24,
      "status": "pending",
      "user": {
        "id": "user1",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### GET /api/leave/admin/balances

**Get all user balances (Admin only)**

```bash
curl http://localhost:3000/api/leave/admin/balances \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "balance_123",
      "userId": "user1",
      "totalCredits": 32,
      "usedCredits": 8,
      "expiredCredits": 0,
      "availableCredits": 24,
      "user": {
        "id": "user1",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### PATCH /api/leave/requests/:id

**Approve or reject a leave request**

```bash
# Approve
curl -X PATCH http://localhost:3000/api/leave/requests/req_123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "approved"
  }'

# Reject
curl -X PATCH http://localhost:3000/api/leave/requests/req_123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "rejected",
    "rejectionReason": "Insufficient coverage during requested period"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Leave request approved successfully",
  "data": {
    "id": "req_123",
    "status": "approved",
    "approvedBy": "admin_123",
    "approvedAt": "2025-01-30T10:00:00.000Z"
  }
}
```

---

## 2. User Endpoints

### POST /api/leave/requests

**Create a leave request**

```bash
curl -X POST http://localhost:3000/api/leave/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2025-03-01T00:00:00.000Z",
    "endDate": "2025-03-03T00:00:00.000Z",
    "hoursPerDay": 8,
    "reason": "Family vacation"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Leave request created successfully",
  "data": {
    "leaveRequest": {
      "id": "req_123",
      "userId": "user_123",
      "startDate": "2025-03-01T00:00:00.000Z",
      "endDate": "2025-03-03T00:00:00.000Z",
      "hoursPerDay": 8,
      "totalHours": 24,
      "status": "pending"
    },
    "creditUtilization": [
      {
        "leaveCreditId": "credit_1",
        "hoursUsed": 16
      },
      {
        "leaveCreditId": "credit_2",
        "hoursUsed": 8
      }
    ]
  }
}
```

**Error (Insufficient balance):**

```json
{
  "success": false,
  "error": "Insufficient leave balance. Required: 24 hours, Available: 8 hours"
}
```

### GET /api/leave/requests

**Get current user's leave requests**

```bash
curl http://localhost:3000/api/leave/requests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "req_123",
      "userId": "user_123",
      "startDate": "2025-03-01T00:00:00.000Z",
      "endDate": "2025-03-03T00:00:00.000Z",
      "totalHours": 24,
      "status": "pending",
      "createdAt": "2025-01-30T10:00:00.000Z"
    }
  ]
}
```

### GET /api/leave/requests/:id

**Get specific leave request with details**

```bash
curl http://localhost:3000/api/leave/requests/req_123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "req_123",
    "userId": "user_123",
    "startDate": "2025-03-01T00:00:00.000Z",
    "endDate": "2025-03-03T00:00:00.000Z",
    "totalHours": 24,
    "status": "approved",
    "approvedBy": "admin_123",
    "approvedAt": "2025-01-30T11:00:00.000Z",
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "approver": {
      "id": "admin_123",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "creditUtilization": [
      {
        "id": "util_1",
        "leaveRequestId": "req_123",
        "leaveCreditId": "credit_1",
        "hoursUsed": 16,
        "leaveCredit": {
          "id": "credit_1",
          "credits": 16,
          "expiresAt": "2025-03-02T00:00:00.000Z",
          "postedAt": "2025-01-01T00:00:00.000Z"
        }
      },
      {
        "id": "util_2",
        "leaveRequestId": "req_123",
        "leaveCreditId": "credit_2",
        "hoursUsed": 8,
        "leaveCredit": {
          "id": "credit_2",
          "credits": 16,
          "expiresAt": "2025-04-02T00:00:00.000Z",
          "postedAt": "2025-02-01T00:00:00.000Z"
        }
      }
    ]
  }
}
```

### DELETE /api/leave/requests/:id

**Cancel a leave request**

```bash
curl -X DELETE http://localhost:3000/api/leave/requests/req_123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "message": "Leave request cancelled successfully",
  "data": {
    "id": "req_123",
    "status": "cancelled",
    "updatedAt": "2025-01-30T10:00:00.000Z"
  }
}
```

### GET /api/leave/balance

**Get current user's leave balance**

```bash
curl http://localhost:3000/api/leave/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalCredits": 32,
    "usedCredits": 24,
    "expiredCredits": 0,
    "availableCredits": 8,
    "lastCalculatedAt": "2025-01-30T10:00:00.000Z",
    "creditBatches": [
      {
        "id": "credit_1",
        "remaining": 0,
        "expiresAt": "2025-03-02T00:00:00.000Z",
        "postedAt": "2025-01-01T00:00:00.000Z"
      },
      {
        "id": "credit_2",
        "remaining": 8,
        "expiresAt": "2025-04-02T00:00:00.000Z",
        "postedAt": "2025-02-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET /api/leave/balance/:userId

**Get specific user's balance (Admin or own)**

```bash
curl http://localhost:3000/api/leave/balance/user_123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### GET /api/leave/transactions

**Get transaction history**

```bash
# Default (50 transactions)
curl http://localhost:3000/api/leave/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"

# With limit
curl "http://localhost:3000/api/leave/transactions?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "txn_1",
      "userId": "user_123",
      "type": "CREDIT_USED",
      "hours": -24,
      "balanceBefore": 32,
      "balanceAfter": 8,
      "notes": "Used 24 hours for leave request",
      "createdAt": "2025-02-10T10:00:00.000Z",
      "leaveRequest": {
        "id": "req_123",
        "startDate": "2025-03-01T00:00:00.000Z",
        "endDate": "2025-03-03T00:00:00.000Z",
        "totalHours": 24,
        "status": "approved"
      }
    },
    {
      "id": "txn_2",
      "userId": "user_123",
      "type": "CREDIT_POSTED",
      "hours": 16,
      "balanceBefore": 16,
      "balanceAfter": 32,
      "notes": "Posted 16 hours, expires 2025-04-02",
      "createdAt": "2025-02-01T00:00:00.000Z",
      "leaveCredit": {
        "id": "credit_2",
        "credits": 16,
        "expiresAt": "2025-04-02T00:00:00.000Z",
        "postedAt": "2025-02-01T00:00:00.000Z"
      }
    }
  ]
}
```

---

## 3. System Endpoints

### POST /api/leave/expire

**Process expired credits (Cron job)**

```bash
curl -X POST http://localhost:3000/api/leave/expire \
  -H "Authorization: Bearer CRON_SECRET"
```

**Response:**

```json
{
  "success": true,
  "message": "Expired credits processed successfully",
  "processed": 5,
  "totalHoursExpired": 40,
  "details": [
    {
      "creditId": "credit_1",
      "hoursExpired": 8
    },
    {
      "creditId": "credit_3",
      "hoursExpired": 16
    }
  ]
}
```

---

## Authentication

All endpoints (except health checks) require authentication. Include the JWT token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Implementation Example

```typescript
// In your app.ts
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  try {
    // Verify JWT
    const user = await verifyJWT(token)
    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

// Apply to protected routes
app.use('/api/leave/*', authMiddleware)
```

---

## Complete Example Workflow

### Scenario: Admin posts credits, user takes leave

```bash
# 1. Admin posts 16 hours to a user (expires in 60 days)
curl -X POST http://localhost:3000/api/leave/credits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "userIds": ["user_123"],
    "credits": 16,
    "hoursPerDay": 8,
    "expiresAt": "2025-03-31T00:00:00.000Z"
  }'

# 2. Check user balance
curl http://localhost:3000/api/leave/balance \
  -H "Authorization: Bearer USER_TOKEN"
# Response: availableCredits: 16

# 3. User creates leave request (3 days = 24 hours)
curl -X POST http://localhost:3000/api/leave/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "startDate": "2025-03-10T00:00:00.000Z",
    "endDate": "2025-03-12T00:00:00.000Z",
    "hoursPerDay": 8,
    "reason": "Vacation"
  }'
# Error: Insufficient balance (need 24, have 16)

# 4. Admin posts additional 16 hours
curl -X POST http://localhost:3000/api/leave/credits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "userIds": ["user_123"],
    "credits": 16,
    "hoursPerDay": 8,
    "expiresAt": "2025-04-30T00:00:00.000Z"
  }'

# 5. User creates leave request again (now has 32 hours)
curl -X POST http://localhost:3000/api/leave/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "startDate": "2025-03-10T00:00:00.000Z",
    "endDate": "2025-03-12T00:00:00.000Z",
    "hoursPerDay": 8,
    "reason": "Vacation"
  }'
# Success! FIFO deducts: 16 from first batch, 8 from second batch

# 6. Admin approves the request
curl -X PATCH http://localhost:3000/api/leave/requests/req_123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "status": "approved"
  }'

# 7. Check balance again
curl http://localhost:3000/api/leave/balance \
  -H "Authorization: Bearer USER_TOKEN"
# Response: availableCredits: 8 (32 - 24 = 8)

# 8. View transaction history
curl http://localhost:3000/api/leave/transactions \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## Cron Jobs

### Setup Cron for Expiration Processing

Run daily at midnight to process expired credits:

```bash
# Using crontab
0 0 * * * curl -X POST http://localhost:3000/api/leave/expire -H "Authorization: Bearer CRON_SECRET"
```

### Using Node-Cron

```typescript
import cron from 'node-cron'

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Processing expired credits...')
  
  try {
    const response = await fetch('http://localhost:3000/api/leave/expire', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer CRON_SECRET',
      },
    })
    
    const result = await response.json()
    console.log('Expiration result:', result)
  } catch (error) {
    console.error('Error processing expired credits:', error)
  }
})
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error, insufficient balance)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## TypeScript Types

```typescript
// Request types
interface PostCreditsRequest {
  userIds: string[]
  credits: number
  hoursPerDay: number
  expiresAt: string
  notes?: string
}

interface CreateLeaveRequest {
  startDate: string
  endDate: string
  hoursPerDay: number
  reason?: string
}

// Response types
interface BalanceResponse {
  totalCredits: number
  usedCredits: number
  expiredCredits: number
  availableCredits: number
  lastCalculatedAt: string
  creditBatches: CreditBatch[]
}

interface CreditBatch {
  id: string
  remaining: number
  expiresAt: string
  postedAt: string
}
```
